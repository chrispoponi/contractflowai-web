
import React from "react";
import { Contract } from "@/api/entities";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Calendar, CheckCircle2, Circle } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import AddToCalendarButton from "../ui/AddToCalendarButton";

const typeColors = {
  "Inspection": "bg-blue-100 text-blue-800",
  "Inspection Response": "bg-purple-100 text-purple-800",
  "Loan Contingency": "bg-orange-100 text-orange-800",
  "Appraisal": "bg-green-100 text-green-800",
  "Final Walkthrough": "bg-indigo-100 text-indigo-800",
  "Closing": "bg-red-100 text-red-800"
};

const completionFields = {
  "Inspection": "inspection_completed",
  "Inspection Response": "inspection_response_completed",
  "Loan Contingency": "loan_contingency_completed",
  "Appraisal": "appraisal_completed",
  "Final Walkthrough": "final_walkthrough_completed",
  "Closing": "closing_completed"
};

export default function UpcomingDates({ dates, isLoading }) {
  const [localDates, setLocalDates] = React.useState(dates);

  React.useEffect(() => {
    setLocalDates(dates);
  }, [dates]);

  const handleMarkComplete = async (item, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const field = completionFields[item.type];
    if (!field) return; 
    
    try {
      const updates = { [field]: true };
      if (field === "closing_completed") {
        updates.status = "closed";
      }
      
      await Contract.update(item.contractId, updates);
      
      // Remove from local state immediately
      setLocalDates(prev => prev.filter(d => 
        !(d.contractId === item.contractId && d.type === item.type)
      ));
    } catch (error) {
      console.error("Error marking date complete:", error);
    }
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Upcoming Dates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calendar className="w-5 h-5 text-[#1e3a5f]" />
          Upcoming Dates
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Mark past dates complete to remove them</p>
      </CardHeader>
      <CardContent className="p-6">
        {localDates.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No upcoming dates</p>
        ) : (
          <div className="space-y-4">
            {localDates.map((item, idx) => {
              const daysUntil = differenceInDays(new Date(item.date), new Date());
              const isOverdue = isPast(new Date(item.date));
              const canMarkComplete = completionFields[item.type] && isOverdue;
              
              return (
                <div key={idx} className="space-y-2">
                  <Link
                    to={createPageUrl(`ContractDetails?id=${item.contractId}`)}
                    className="block"
                  >
                    <div className={`p-4 border rounded-lg transition-all duration-200 ${
                      isOverdue 
                        ? 'border-red-300 bg-red-50 hover:border-red-500' 
                        : 'border-gray-200 hover:border-[#1e3a5f] hover:shadow-md'
                    }`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={typeColors[item.type]}>
                            {item.type}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              OVERDUE
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold ${
                            isOverdue ? "text-red-600" : daysUntil <= 3 ? "text-orange-600" : "text-gray-600"
                          }`}>
                            {daysUntil === 0 ? "Today" : isOverdue ? `${Math.abs(daysUntil)}d ago` : `${daysUntil}d`}
                          </span>
                          {canMarkComplete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-green-100"
                              onClick={(e) => handleMarkComplete(item, e)}
                              title="Mark as complete"
                            >
                              <Circle className="w-5 h-5 text-gray-400 hover:text-green-600" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 font-medium mb-1">
                        {item.property}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(item.date), "MMM d, yyyy")}
                      </p>
                      {isOverdue && canMarkComplete && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          Click the circle to mark complete →
                        </p>
                      )}
                    </div>
                  </Link>
                  
                  <div onClick={(e) => e.stopPropagation()}>
                    <AddToCalendarButton
                      event={{
                        title: `${item.type} - ${item.property}`,
                        date: item.date,
                        description: `${item.type} for ${item.property}`,
                        location: item.property
                      }}
                      size="sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
