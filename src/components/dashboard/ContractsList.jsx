import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

const statusColors = {
  pending: "bg-gray-100 text-gray-800",
  under_contract: "bg-blue-100 text-blue-800",
  inspection: "bg-purple-100 text-purple-800",
  financing: "bg-orange-100 text-orange-800",
  closing: "bg-yellow-100 text-yellow-800",
  closed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800"
};

export default function ContractsList({ contracts, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Recent Contracts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array(3).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader className="border-b">
        <CardTitle className="text-xl">Recent Contracts</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {contracts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No contracts yet</p>
            <Link to={createPageUrl("Upload")}>
              <span className="text-[#1e3a5f] hover:underline font-medium">Upload your first contract</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <Link
                key={contract.id}
                to={createPageUrl(`ContractDetails?id=${contract.id}`)}
                className="block"
              >
                <div className="p-5 border border-gray-200 rounded-xl hover:border-[#1e3a5f] hover:shadow-md transition-all duration-300 bg-white">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <MapPin className="w-5 h-5 text-[#1e3a5f] mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                          {contract.property_address}
                        </h3>
                        <Badge className={statusColors[contract.status]}>
                          {contract.status?.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4 text-green-600" />
                      <span className="text-gray-600">Price:</span>
                      <span className="font-semibold">
                        ${contract.purchase_price?.toLocaleString() || "—"}
                      </span>
                    </div>
                    {contract.closing_date && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-[#1e3a5f]" />
                        <span className="text-gray-600">Closing:</span>
                        <span className="font-semibold">
                          {format(new Date(contract.closing_date), "MMM d")}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}