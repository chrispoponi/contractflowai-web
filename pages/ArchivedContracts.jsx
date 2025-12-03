
import React, { useState, useEffect } from "react";
import { Contract } from "@/api/entities";
import { User } from "@/api/entities"; // Added User import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, DollarSign, Calendar, Archive, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function ArchivedContractsPage() {
  const [contracts, setContracts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthAndLoadContracts();
  }, []);

  const checkAuthAndLoadContracts = async () => {
    try {
      const userData = await User.me();
      if (!userData) {
        User.redirectToLogin(window.location.pathname);
        return;
      }
      loadContracts();
    } catch (error) {
      console.error("Auth error:", error);
      User.redirectToLogin(window.location.pathname);
    }
  };

  const loadContracts = async () => {
    setIsLoading(true);
    const data = await Contract.list("-updated_date");
    
    // Get closed and cancelled contracts
    const archived = data.filter(c => 
      c.closing_completed || c.status === "closed" || c.status === "cancelled"
    );
    
    setContracts(archived);
    setIsLoading(false);
  };

  const closedContracts = contracts.filter(c => c.closing_completed || c.status === "closed");
  const cancelledContracts = contracts.filter(c => c.status === "cancelled");

  const ContractCard = ({ contract }) => (
    <Link
      to={createPageUrl(`ContractDetails?id=${contract.id}`)}
      className="block"
    >
      <div className={`p-5 border rounded-xl transition-all duration-300 bg-white opacity-75 hover:opacity-100 ${
        contract.status === "cancelled" 
          ? "border-gray-200 hover:border-red-500 hover:shadow-md" 
          : "border-gray-200 hover:border-green-500 hover:shadow-md"
      }`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-3 flex-1">
            <MapPin className={`w-5 h-5 mt-1 ${
              contract.status === "cancelled" ? "text-red-600" : "text-green-600"
            }`} />
            <div>
              <h3 className="font-semibold text-gray-900 text-lg mb-1">
                {contract.property_address}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={
                  contract.status === "cancelled" 
                    ? "bg-red-100 text-red-800" 
                    : "bg-green-100 text-green-800"
                }>
                  {contract.status === "cancelled" ? "Cancelled" : "Closed"}
                </Badge>
                {contract.is_counter_offer && (
                  <Badge className="bg-purple-100 text-purple-800">
                    Counter Offer #{contract.counter_offer_number}
                  </Badge>
                )}
                {contract.cancellation_reason && (
                  <Badge variant="outline" className="text-xs">
                    {contract.cancellation_reason.replace(/_/g, ' ')}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm">
            <DollarSign className={`w-4 h-4 ${
              contract.status === "cancelled" ? "text-red-600" : "text-green-600"
            }`} />
            <span className="text-gray-600">Price:</span>
            <span className="font-semibold">
              ${contract.purchase_price?.toLocaleString() || "—"}
            </span>
          </div>
          {contract.status === "cancelled" && contract.cancellation_date ? (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-red-600" />
              <span className="text-gray-600">Cancelled:</span>
              <span className="font-semibold">
                {format(new Date(contract.cancellation_date), "MMM d, yyyy")}
              </span>
            </div>
          ) : contract.closing_date ? (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">Closed:</span>
              <span className="font-semibold">
                {format(new Date(contract.closing_date), "MMM d, yyyy")}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
            📦 Archived Contracts
          </h1>
          <p className="text-gray-600">View completed and cancelled contracts</p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="all">
              All ({contracts.length})
            </TabsTrigger>
            <TabsTrigger value="closed">
              <Archive className="w-4 h-4 mr-2" />
              Closed ({closedContracts.length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              <XCircle className="w-4 h-4 mr-2" />
              Cancelled ({cancelledContracts.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="shadow-lg">
              <CardHeader className="border-b bg-gray-50">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Archive className="w-5 h-5 text-gray-600" />
                  All Archived Contracts ({contracts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : contracts.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2">No archived contracts yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contracts.map((contract) => (
                      <ContractCard key={contract.id} contract={contract} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="closed">
            <Card className="shadow-lg border-l-4 border-green-500">
              <CardHeader className="border-b bg-green-50">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Archive className="w-5 h-5 text-green-600" />
                  Closed Contracts ({closedContracts.length})
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Successfully closed deals
                </p>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : closedContracts.length === 0 ? (
                  <div className="text-center py-12">
                    <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No closed contracts yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {closedContracts.map((contract) => (
                      <ContractCard key={contract.id} contract={contract} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cancelled">
            <Card className="shadow-lg border-l-4 border-red-500">
              <CardHeader className="border-b bg-red-50">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <XCircle className="w-5 h-5 text-red-600" />
                  Cancelled Contracts ({cancelledContracts.length})
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Deals that did not close
                </p>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {Array(3).fill(0).map((_, i) => (
                      <Skeleton key={i} className="h-32 w-full" />
                    ))}
                  </div>
                ) : cancelledContracts.length === 0 ? (
                  <div className="text-center py-12">
                    <XCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No cancelled contracts</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cancelledContracts.map((contract) => (
                      <ContractCard key={contract.id} contract={contract} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
