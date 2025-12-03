import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MapPin, DollarSign, Calendar, Archive } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

export default function ArchivedContracts({ contracts, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Archived Contracts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Array(2).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-l-4 border-green-500">
      <CardHeader className="border-b bg-green-50">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Archive className="w-5 h-5 text-green-600" />
          Archived Contracts ({contracts.length})
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">Completed contracts - closings marked as done</p>
      </CardHeader>
      <CardContent className="p-6">
        {contracts.length === 0 ? (
          <div className="text-center py-12">
            <Archive className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No archived contracts yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <Link
                key={contract.id}
                to={createPageUrl(`ContractDetails?id=${contract.id}`)}
                className="block"
              >
                <div className="p-5 border border-gray-200 rounded-xl hover:border-green-500 hover:shadow-md transition-all duration-300 bg-white opacity-75 hover:opacity-100">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-start gap-3 flex-1">
                      <MapPin className="w-5 h-5 text-green-600 mt-1" />
                      <div>
                        <h3 className="font-semibold text-gray-900 text-lg mb-1">
                          {contract.property_address}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className="bg-green-100 text-green-800">
                            Closed
                          </Badge>
                          {contract.is_counter_offer && (
                            <Badge className="bg-purple-100 text-purple-800">
                              Counter Offer #{contract.counter_offer_number}
                            </Badge>
                          )}
                        </div>
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
                        <Calendar className="w-4 h-4 text-green-600" />
                        <span className="text-gray-600">Closed:</span>
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