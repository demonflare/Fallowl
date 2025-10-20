import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  Edit, 
  Save, 
  X, 
  FileText, 
  User, 
  Calendar,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ContactForNotes {
  id: number;
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  notes?: string | null;
  updatedAt: string;
}

interface ContactNotesProps {
  contact: ContactForNotes;
  variant?: 'full' | 'compact' | 'inline';
  className?: string;
}

export function ContactNotes({ contact, variant = 'full', className }: ContactNotesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState(contact.notes || '');
  const [originalNotes, setOriginalNotes] = useState(contact.notes || '');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    setNotes(contact.notes || '');
    setOriginalNotes(contact.notes || '');
  }, [contact.notes]);

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      return apiRequest('PUT', `/api/contacts/${contact.id}`, {
        notes: newNotes
      });
    },
    onSuccess: () => {
      // Invalidate all contact-related queries to update notes everywhere
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: [`/api/contacts/${contact.id}`] });
      
      setOriginalNotes(notes);
      setIsEditing(false);
      
      toast({
        title: "Notes Updated",
        description: `Notes for ${contact.name} have been saved.`
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update notes",
        variant: "destructive"
      });
    }
  });

  const handleSave = () => {
    if (notes.trim() === originalNotes.trim()) {
      setIsEditing(false);
      return;
    }
    updateNotesMutation.mutate(notes.trim());
  };

  const handleCancel = () => {
    setNotes(originalNotes);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSave();
    }
  };

  // Compact inline variant for small spaces
  if (variant === 'inline') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center gap-2">
          <FileText className="w-3 h-3 text-gray-500" />
          <span className="text-xs font-medium text-gray-600">Notes</span>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Add notes for ${contact.name}...`}
              className="min-h-[60px] text-xs"
              autoFocus
            />
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleSave}
                disabled={updateNotesMutation.isPending}
              >
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleCancel}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="text-xs text-gray-700 whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded border min-h-[40px]"
            onClick={() => setIsEditing(true)}
          >
            {notes || <span className="text-gray-400 italic">Click to add notes...</span>}
          </div>
        )}
      </div>
    );
  }

  // Compact variant for sidebar or small cards
  if (variant === 'compact') {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium">Notes</span>
          </div>
          {!isEditing && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setIsEditing(true)}
            >
              <Edit className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        {isEditing ? (
          <div className="space-y-2">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Add notes for ${contact.name}...`}
              className="min-h-[80px] text-sm"
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={updateNotesMutation.isPending}
              >
                <Save className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
              >
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div 
            className="text-sm text-gray-700 whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-2 rounded border min-h-[60px]"
            onClick={() => setIsEditing(true)}
          >
            {notes || <span className="text-gray-400 italic">Click to add notes...</span>}
          </div>
        )}
      </div>
    );
  }

  // Full variant with card layout
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Contact Notes
          </CardTitle>
          <div className="flex items-center gap-2">
            {contact.updatedAt && (
              <Badge variant="outline" className="text-xs">
                <Clock className="w-3 h-3 mr-1" />
                {format(new Date(contact.updatedAt), 'MMM d')}
              </Badge>
            )}
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="w-3 h-3 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="w-3 h-3" />
          <span>{contact.name}</span>
          {contact.company && (
            <>
              <span>•</span>
              <span>{contact.company}</span>
            </>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Add detailed notes for ${contact.name}...\n\n• Meeting outcomes\n• Follow-up actions\n• Important details\n• Communication history`}
              className="min-h-[120px]"
              autoFocus
            />
            
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-500">
                Press Ctrl+Enter to save, Escape to cancel
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                >
                  <X className="w-4 h-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateNotesMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-1" />
                  {updateNotesMutation.isPending ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div 
            className="text-gray-700 whitespace-pre-wrap cursor-pointer hover:bg-gray-50 p-3 rounded border min-h-[100px] transition-colors"
            onClick={() => setIsEditing(true)}
          >
            {notes || (
              <div className="text-gray-400 italic space-y-1">
                <div>No notes yet. Click to add notes...</div>
                <div className="text-xs">
                  • Meeting outcomes
                </div>
                <div className="text-xs">
                  • Follow-up actions  
                </div>
                <div className="text-xs">
                  • Important details
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}