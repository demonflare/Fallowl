import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneCall, PhoneOff } from "lucide-react";
import { format } from "date-fns";
import type { Call } from "@shared/schema";

export default function RecentCalls() {
  const { data: calls = [], isLoading } = useQuery<Call[]>({
    queryKey: ["/api/calls/recent"],
  });

  const getCallIcon = (type: string) => {
    switch (type) {
      case 'incoming': return <PhoneCall className="w-4 h-4 text-green-600" />;
      case 'outgoing': return <Phone className="w-4 h-4 text-blue-600" />;
      case 'missed': return <PhoneOff className="w-4 h-4 text-red-600" />;
      default: return <Phone className="w-4 h-4 text-gray-600" />;
    }
  };

  const getInitials = (phone: string) => {
    return phone.slice(-4);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Calls</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                  <div className="ml-3">
                    <div className="w-24 h-4 bg-gray-300 rounded"></div>
                    <div className="w-32 h-3 bg-gray-300 rounded mt-1"></div>
                  </div>
                </div>
                <div className="w-16 h-3 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Calls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {calls.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Phone className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recent calls</p>
            </div>
          ) : (
            calls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              >
                <div className="flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-sm">
                      {getInitials(call.phone)}
                    </span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-800">{call.phone}</p>
                    <p className="text-xs text-gray-500">
                      {call.duration ? `${Math.floor(call.duration / 60)}:${(call.duration % 60).toString().padStart(2, '0')}` : 'No duration'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {getCallIcon(call.type)}
                  <p className="text-xs text-gray-500">
                    {call.createdAt ? format(new Date(call.createdAt), 'MMM d, HH:mm') : 'Unknown'}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
