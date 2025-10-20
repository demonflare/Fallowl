import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Download, Phone, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Voicemail } from "@shared/schema";

export default function VoicemailPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: voicemails = [], isLoading } = useQuery<Voicemail[]>({
    queryKey: ["/api/voicemails"],
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/voicemails/${id}`, { isRead: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voicemails"] });
    },
  });

  const deleteVoicemailMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/voicemails/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voicemails"] });
      toast({
        title: "Voicemail deleted",
        description: "Voicemail has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete voicemail",
        variant: "destructive",
      });
    },
  });

  const filteredVoicemails = voicemails.filter(voicemail => {
    const matchesSearch = !searchQuery || 
      voicemail.phone.includes(searchQuery);
    
    const matchesFilter = filter === "all" || 
      (filter === "unread" && !voicemail.isRead) ||
      (filter === "read" && voicemail.isRead);
    
    return matchesSearch && matchesFilter;
  });

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getInitials = (phone: string) => {
    return phone.slice(-4);
  };

  const handlePlay = (voicemail: Voicemail) => {
    if (!voicemail.isRead) {
      markAsReadMutation.mutate(voicemail.id);
    }
    toast({
      title: "Playing voicemail",
      description: `Playing voicemail from ${voicemail.phone}`,
    });
  };

  const handleDownload = (voicemail: Voicemail) => {
    toast({
      title: "Downloading voicemail",
      description: `Downloading voicemail from ${voicemail.phone}`,
    });
  };

  const handleCallBack = (voicemail: Voicemail) => {
    toast({
      title: "Calling back",
      description: `Calling ${voicemail.phone}`,
    });
  };

  const handleDelete = (voicemail: Voicemail) => {
    if (window.confirm("Are you sure you want to delete this voicemail?")) {
      deleteVoicemailMutation.mutate(voicemail.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Voicemail</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gray-300 rounded-full"></div>
                    <div className="ml-3">
                      <div className="w-24 h-4 bg-gray-300 rounded"></div>
                      <div className="w-32 h-3 bg-gray-300 rounded mt-1"></div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="w-16 h-6 bg-gray-300 rounded"></div>
                    <div className="w-16 h-8 bg-gray-300 rounded"></div>
                  </div>
                </div>
                <div className="w-full h-2 bg-gray-300 rounded mb-3"></div>
                <div className="flex space-x-2">
                  <div className="w-20 h-6 bg-gray-300 rounded"></div>
                  <div className="w-20 h-6 bg-gray-300 rounded"></div>
                  <div className="w-16 h-6 bg-gray-300 rounded"></div>
                </div>
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
        <div className="flex items-center justify-between">
          <CardTitle>Voicemail</CardTitle>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Input
                placeholder="Search voicemails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Messages</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredVoicemails.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No voicemails found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredVoicemails.map((voicemail) => (
              <div
                key={voicemail.id}
                className={`rounded-lg p-4 border ${
                  voicemail.isRead ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {getInitials(voicemail.phone)}
                      </span>
                    </div>
                    <div className="ml-3">
                      <p className="font-medium text-gray-800">{voicemail.phone}</p>
                      <p className="text-xs text-gray-500">
                        {voicemail.createdAt ? format(new Date(voicemail.createdAt), 'MMM d, yyyy \'at\' h:mm a') : 'Unknown time'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!voicemail.isRead && (
                      <Badge className="bg-blue-100 text-blue-800">New</Badge>
                    )}
                    <Button
                      onClick={() => handlePlay(voicemail)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Play
                    </Button>
                  </div>
                </div>
                
                <div className="mt-3 flex items-center space-x-4">
                  <div className="flex-1">
                    <Progress value={voicemail.isRead ? 100 : 0} className="h-2" />
                  </div>
                  <span className="text-sm text-gray-600">
                    {formatDuration(voicemail.duration)}
                  </span>
                </div>
                
                <div className="mt-3 flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(voicemail)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCallBack(voicemail)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Phone className="w-4 h-4 mr-1" />
                    Call Back
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(voicemail)}
                    className="text-sm text-red-600 hover:text-red-800"
                    disabled={deleteVoicemailMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
