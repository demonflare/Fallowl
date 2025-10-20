import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileText, Save } from "lucide-react";

interface NotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (notes: string) => void;
  initialNotes?: string;
  title?: string;
}

export default function NotesModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialNotes = '',
  title = 'Call Notes'
}: NotesModalProps) {
  const [notes, setNotes] = useState(initialNotes);

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(notes);
    onClose();
  };

  const handleSaveAndContinue = () => {
    onSave(notes);
    // Don't close the modal, just save
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="notes" className="text-sm font-medium">
              Add your notes about this call:
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter call notes, important points, follow-up actions..."
              rows={8}
              className="mt-2 resize-none"
              autoFocus
            />
          </div>

          <div className="text-xs text-muted-foreground">
            Tip: Include key discussion points, decisions made, and next steps.
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="secondary" 
              onClick={handleSaveAndContinue}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save & Continue
            </Button>
            <Button type="submit" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save & Close
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}