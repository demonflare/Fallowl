import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send } from "lucide-react";

export default function EmailsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Emails</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Email management and communication
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Integration</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <Send className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p className="text-gray-500 mb-4">Email integration coming soon</p>
          <p className="text-sm text-gray-400">
            Send and receive emails directly from your CRM
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
