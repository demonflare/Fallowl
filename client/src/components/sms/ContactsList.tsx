import { useQuery } from "@tanstack/react-query";
import { useStore } from "@/store/useStore";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { Contact } from "@shared/schema";

export default function ContactsList() {
  const { selectedContact, setSelectedContact } = useStore();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: contacts = [], isLoading } = useQuery<Contact[]>({
    queryKey: searchQuery ? ["/api/contacts/search", { q: searchQuery }] : ["/api/contacts"],
  });

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getColorClass = (id: number) => {
    const colors = [
      'bg-blue-100 text-blue-600',
      'bg-green-100 text-green-600', 
      'bg-purple-100 text-purple-600',
      'bg-orange-100 text-orange-600',
      'bg-pink-100 text-pink-600',
    ];
    return colors[id % colors.length];
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <div className="w-full h-10 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
        <div className="p-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center p-3 animate-pulse">
              <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
              <div className="ml-3 flex-1">
                <div className="w-24 h-4 bg-gray-300 rounded"></div>
                <div className="w-32 h-3 bg-gray-300 rounded mt-1"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
        </div>
      </div>
      <div className="overflow-y-auto max-h-96">
        <div className="p-2">
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No contacts found</p>
            </div>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact.id)}
                className={cn(
                  "flex items-center p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer w-full text-left",
                  selectedContact === contact.id && "bg-blue-50 border-l-4 border-blue-600"
                )}
              >
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", getColorClass(contact.id))}>
                  <span className="font-medium">{getInitials(contact.name)}</span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-800">{contact.name}</p>
                  <p className="text-xs text-gray-500">{contact.phone}</p>
                </div>
                <div className="text-right">
                  <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">2</span>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
