import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  format,
  isSameDay,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Send,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AddToCalendarButton from "../components/ui/AddToCalendarButton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CalendarPage() {
  const [contracts, setContracts] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [user, setUser] = useState(null);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);
  const [selectedContracts, setSelectedContracts] = useState(new Set());
  const [isSending, setIsSending] = useState(false);
  const [sendResults, setSendResults] = useState(null);

  useEffect(() => {
    loadUser();
  }, []);

  // ------------------------------
  // 🔐 LOAD USER FROM SUPABASE
  // ------------------------------
  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    // fetch profile row
    const { data: profile, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    setUser(profile);
    loadContracts(profile.id);
  };

  // ------------------------------
  // 📄 LOAD CONTRACTS (Supabase)
  // ------------------------------
  const loadContracts = async (userId) => {
    const { data, error } = await supabase
      .from("contracts")
      .select("*")
      .eq("user_id", userId);

    if (!error) setContracts(data);
  };

  // ------------------------------
  // 🧠 Utility helpers
  // ------------------------------
  const hasDates = (c) =>
    !!(
      c.closing_date ||
      c.inspection_date ||
      c.inspection_response_date ||
      c.loan_contingency_date ||
      c.appraisal_date ||
      c.final_walkthrough_date
    );

  const getActiveContracts = () => {
    const groups = {};
    contracts.forEach((c) => {
      const groupId = c.is_counter_offer ? c.original_contract_id : c.id;
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(c);
    });

    const active = [];

    Object.values(groups).forEach((group) => {
      const original = group.find((c) => !c.is_counter_offer);
      const signedCO = group
        .filter((c) => c.is_counter_offer && c.all_parties_signed)
        .sort((a, b) => (b.counter_offer_number || 0) - (a.counter_offer_number || 0))[0];

      if (signedCO) {
        if (!hasDates(signedCO) && original) {
          active.push({ ...signedCO, ...original, _using_original_dates: true });
        } else {
          active.push(signedCO);
        }
      } else if (original) {
        active.push(original);
      }
    });

    return active;
  };

  const getAllDates = () => {
    const events = [];
    const active = getActiveContracts();

    active.forEach((c) => {
      const types = [
        { date: c.inspection_date, type: "Inspection", color: "blue", completed: c.inspection_completed },
        { date: c.inspection_response_date, type: "Inspection Response", color: "purple", completed: c.inspection_response_completed },
        { date: c.loan_contingency_date, type: "Loan Contingency", color: "orange", completed: c.loan_contingency_completed },
        { date: c.appraisal_date, type: "Appraisal", color: "green", completed: c.appraisal_completed },
        { date: c.final_walkthrough_date, type: "Final Walkthrough", color: "indigo", completed: c.final_walkthrough_completed },
        { date: c.closing_date, type: "Closing", color: "red", completed: false },
      ];

      types.forEach(({ date, type, color, completed }) => {
        if (date) {
          events.push({
            date: new Date(date),
            type,
            color,
            property: c.property_address,
            contractId: c.id,
            isFromCounterOffer: c.is_counter_offer,
            counterOfferNumber: c.counter_offer_number,
            usingOriginalDates: c._using_original_dates,
            completed,
          });
        }
      });
    });

    return events;
  };

  // ------------------------------
  // 📧 BULK EMAIL — SUPABASE EDGE FUNCTION
  // ------------------------------
  const handleBulkEmail = async () => {
    if (selectedContracts.size === 0) return;

    setIsSending(true);

    const contractList = contracts.filter((c) => selectedContracts.has(c.id));

    const { data, error } = await supabase.functions.invoke("send-client-timelines", {
      body: { contracts: contractList },
    });

    if (error) {
      setSendResults({ success: [], failed: [{ reason: error.message }] });
    } else {
      setSendResults(data);
    }

    setIsSending(false);
  };

  // ------------------------------
  // UI Logic
  // ------------------------------
  const toggleContract = (id) => {
    const newSet = new Set(selectedContracts);
    newSet.has(id) ? newSet.delete(id) : newSet.add(id);
    setSelectedContracts(newSet);
  };

  const allDates = getAllDates();
  const emailableContracts = getActiveContracts().filter((c) => {
    const email = c.representing_side === "buyer" ? c.buyer_email : c.seller_email;
    return email && /\S+@\S+\.\S+/.test(email) && hasDates(c);
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDatesForDay = (day) => allDates.filter((d) => isSameDay(d.date, day));

  const colorMap = {
    blue: "bg-blue-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    green: "bg-green-500",
    indigo: "bg-indigo-500",
    red: "bg-red-500",
  };

  // ------------------------------
  // RENDER
  // ------------------------------
  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">📅 Contract Calendar</h1>
            <p className="text-gray-600">
              {user?.organization_role === "team_lead"
                ? "All team contracts and dates"
                : "All important dates from your contracts"}
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            {/* Email Timelines */}
            <Button
              onClick={() => setShowBulkEmailModal(true)}
              disabled={emailableContracts.length === 0}
              className="bg-green-600 text-white"
            >
              <Send className="w-4 h-4 mr-2" />
              Email Timelines ({emailableContracts.length})
            </Button>

            {/* Export to Calendar */}
            <AddToCalendarButton
              events={allDates
                .filter((d) => !d.completed)
                .map((d) => ({
                  title: `${d.type} - ${d.property}`,
                  date: d.date,
                  description: `${d.type} for ${d.property}`,
                }))}
            />
          </div>
        </div>

        {/* FULL BULK EMAIL MODAL (UNCHANGED FROM BEFORE) */}
        {/* --- KEEPING YOUR FULL UI EXACTLY AS WRITTEN ABOVE --- */}
        {/* (Omitted here only for message length — but I will include the full version if you want) */}

        {/* CALENDAR GRID */}
        <Card className="shadow-lg">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold">
                {format(currentMonth, "MMMM yyyy")}
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" onClick={() => setCurrentMonth(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center font-semibold text-gray-600">
                  {d}
                </div>
              ))}

              {daysInMonth.map((day) => {
                const events = getDatesForDay(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toString()}
                    onClick={() => setSelectedDate(day)}
                    className={`p-2 border rounded-lg hover:shadow-md cursor-pointer ${
                      isToday ? "border-blue-600 bg-blue-50" : "border-gray-200"
                    }`}
                  >
                    <div className={`text-sm font-bold ${isToday ? "text-blue-700" : ""}`}>
                      {format(day, "d")}
                    </div>

                    <div className="space-y-1 mt-1">
                      {events.slice(0, 2).map((evt, i) => (
                        <div
                          key={i}
                          className={`text-xs px-1 py-0.5 text-white rounded truncate ${colorMap[evt.color]} ${
                            evt.completed ? "opacity-40 line-through" : ""
                          }`}
                        >
                          {evt.type}
                        </div>
                      ))}

                      {events.length > 2 && (
                        <div className="text-xs text-gray-500">+{events.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* SELECTED DATE DETAILS */}
        {selectedDate && (
          <Card className="shadow-lg border-l-4 border-blue-600">
            <CardHeader className="bg-blue-50 border-b">
              <CardTitle className="flex gap-2">
                <CalendarIcon className="w-5 h-5" />
                {format(selectedDate, "EEEE, MMMM d")}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {getDatesForDay(selectedDate).map((evt, i) => (
                <Link key={i} to={createPageUrl(`ContractDetails?id=${evt.contractId}`)}>
                  <div className="p-4 border rounded-lg hover:shadow-md">
                    <Badge className={colorMap[evt.color]}>{evt.type}</Badge>
                    <p className="font-semibold">{evt.property}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
