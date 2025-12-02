import React from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function StatsOverview({ title, value, icon: Icon, color, isLoading }) {
  const colorMap = {
    blue: "from-blue-500 to-blue-600",
    gold: "from-[#c9a961] to-[#b8935a]",
    green: "from-green-500 to-green-600"
  };

  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader className="p-6">
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-12 w-16" />
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden relative">
      <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${colorMap[color]} opacity-10 rounded-full transform translate-x-12 -translate-y-12`} />
      <CardHeader className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
            <p className="text-4xl font-bold text-gray-900">{value}</p>
          </div>
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorMap[color]} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}