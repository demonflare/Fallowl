import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, MessageSquare, Mail, MapPin, Heart, Share, Edit, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact } from "@shared/schema";

interface ContactCardProps {
  contact: Contact;
  onCall?: (phone: string) => void;
  onSms?: (contactId: number) => void;
  onEdit?: (contact: Contact) => void;
}

export default function ContactCard({ contact, onCall, onSms, onEdit }: ContactCardProps) {
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (id: number) => {
    const colors = [
      'bg-gradient-to-br from-blue-500 to-blue-600',
      'bg-gradient-to-br from-emerald-500 to-emerald-600', 
      'bg-gradient-to-br from-purple-500 to-purple-600',
      'bg-gradient-to-br from-orange-500 to-orange-600',
      'bg-gradient-to-br from-pink-500 to-pink-600',
      'bg-gradient-to-br from-indigo-500 to-indigo-600',
      'bg-gradient-to-br from-cyan-500 to-cyan-600',
      'bg-gradient-to-br from-red-500 to-red-600',
    ];
    return colors[id % colors.length];
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'new': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'contacted': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'qualified': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'converted': return 'bg-green-100 text-green-700 border-green-200';
      case 'lost': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getDispositionDisplay = (disposition: string) => {
    switch (disposition?.toLowerCase()) {
      case 'answered': return 'Answered';
      case 'human': return 'Human';
      case 'voicemail': return 'Voicemail';
      case 'machine': return 'Machine';
      case 'busy': return 'Busy';
      case 'no-answer': return 'No Answer';
      case 'failed': return 'Failed';
      case 'callback-requested': return 'Callback Req.';
      case 'interested': return 'Interested';
      case 'not-interested': return 'Not Interested';
      case 'qualified': return 'Qualified';
      case 'wrong-number': return 'Wrong Number';
      case 'disconnected': return 'Disconnected';
      case 'dnc-requested': return 'DNC Req.';
      case 'dnc-skipped': return 'DNC Skip';
      default: return 'Prospect';
    }
  };

  const formatFollowUp = (date: string | Date | null) => {
    if (!date) return null;
    const followUpDate = new Date(date);
    const now = new Date();
    const diffTime = followUpDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Follow-up: today';
    if (diffDays === 1) return 'Follow-up: tomorrow';
    if (diffDays > 0) return `Follow-up: in ${diffDays} days`;
    if (diffDays === -1) return 'Follow-up: yesterday';
    return `Follow-up: ${Math.abs(diffDays)} days ago`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2.5 hover:shadow-md hover:border-gray-300 transition-all duration-200 group">
      {/* Header with avatar, name, company, job title, and priority badge */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start space-x-2 min-w-0 flex-1">
          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-xs shadow-sm flex-shrink-0", getAvatarColor(contact.id))}>
            {getInitials(contact.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight truncate">
              {contact.name}
            </h3>
            {contact.jobTitle && (
              <p className="text-xs text-gray-600 leading-tight break-words">
                {contact.jobTitle}
              </p>
            )}
            {contact.company && (
              <p className="text-xs text-gray-500 leading-tight break-words">
                {contact.company}
              </p>
            )}
          </div>
        </div>
        
        {contact.priority && (
          <Badge className={cn("text-xs font-medium border px-1.5 py-0.5 flex-shrink-0", getPriorityBadge(contact.priority))}>
            {contact.priority.charAt(0).toUpperCase()}
          </Badge>
        )}
      </div>

      {/* Contact Info - Ultra compact */}
      <div className="space-y-0.5 mb-1.5">
        <div className="flex items-center text-xs text-gray-700">
          <Phone className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
          <span className="font-mono text-xs truncate">{contact.phone}</span>
        </div>
        
        {contact.email && (
          <div className="flex items-center text-xs text-gray-700">
            <Mail className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="truncate text-xs">{contact.email}</span>
          </div>
        )}

        {(contact.city || contact.state) && (
          <div className="flex items-center text-xs text-gray-600">
            <MapPin className="w-3 h-3 mr-1.5 text-gray-400 flex-shrink-0" />
            <span className="truncate text-xs">
              {[contact.city, contact.state].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* Status badges - Ultra compact */}
      <div className="flex flex-wrap gap-1 mb-1.5">
        {contact.leadStatus && (
          <Badge className={cn("text-xs font-medium border px-1.5 py-0.5", getStatusBadge(contact.leadStatus))}>
            {contact.leadStatus}
          </Badge>
        )}
        
        {contact.disposition && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            {getDispositionDisplay(contact.disposition)}
          </span>
        )}

        {contact.nextFollowUpAt && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600">
            📅 {formatFollowUp(contact.nextFollowUpAt)?.replace('Follow-up: ', '')}
          </span>
        )}
      </div>

      {/* Notes preview */}
      {contact.notes && (
        <div className="mb-1.5">
          <p className="text-xs text-gray-600 bg-gray-50 rounded px-2 py-0.5 truncate">
            📝 {contact.notes}
          </p>
        </div>
      )}

      {/* Action Buttons - Icon only at bottom */}
      <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-gray-100">
        <Button
          onClick={() => onCall?.(contact.phone)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded h-7 w-7 p-0 transition-colors"
          data-testid={`button-call-${contact.id}`}
          title="Call"
        >
          <Phone className="w-3.5 h-3.5" />
        </Button>
        <Button
          onClick={() => onSms?.(contact.id)}
          size="sm"
          className="bg-green-600 hover:bg-green-700 text-white rounded h-7 w-7 p-0 transition-colors"
          data-testid={`button-sms-${contact.id}`}
          title="SMS"
        >
          <MessageSquare className="w-3.5 h-3.5" />
        </Button>
        <Button
          onClick={() => onEdit?.(contact)}
          size="sm"
          className="bg-amber-600 hover:bg-amber-700 text-white rounded h-7 w-7 p-0 transition-colors"
          data-testid={`button-notes-${contact.id}`}
          title="Make Notes"
        >
          <Edit className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
