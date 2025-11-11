import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Lead } from "@/pages/Board";

interface BulkActionsBarProps {
  selectedLeads: string[];
  leads: Lead[];
  onClearSelection: () => void;
  onLeadsDeleted: () => void;
}

export function BulkActionsBar({
  selectedLeads,
  leads,
  onClearSelection,
  onLeadsDeleted,
}: BulkActionsBarProps) {
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (selectedLeads.length === 0) return null;

  const handleBulkDelete = async () => {
    if (!user) {
      console.error('No user found for bulk delete');
      return;
    }

    console.log('Starting bulk delete for leads:', selectedLeads);
    setIsDeleting(true);
    try {
      // Get selected leads data
      const leadsToDelete = leads.filter((lead) =>
        selectedLeads.includes(lead.id)
      );

      // Soft delete to deleted_leads table
      const deletedLeadsData = leadsToDelete.map((lead) => ({
        lead_id: lead.id,
        lead_data: {
          order_id: lead.order_id,
          customer_name: lead.customer_name,
          customer_email: lead.customer_email,
          customer_phone: lead.customer_phone,
          customer_address: lead.customer_address,
          status: lead.status,
          assigned_to: lead.assigned_to,
          created_by: lead.created_by,
          notes: lead.notes,
          created_at: lead.created_at,
          updated_at: lead.updated_at,
        },
        lead_items: lead.lead_items || [],
        deleted_by: user.id,
      }));

      const { error: insertError } = await supabase
        .from("deleted_leads")
        .insert(deletedLeadsData as any);

      if (insertError) throw insertError;

      // Delete from leads table
      const { error: deleteError } = await supabase
        .from("leads")
        .delete()
        .in("id", selectedLeads);

      if (deleteError) throw deleteError;

      toast.success(
        `${selectedLeads.length} leads deleted (can be restored within 30 days)`
      );
      setShowDeleteDialog(false);
      onClearSelection();
      onLeadsDeleted();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete leads");
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="fixed bottom-6 left-1/2 -translate-x-1/2 p-4 shadow-lg z-50 animate-in slide-in-from-bottom-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">
            {selectedLeads.length} lead{selectedLeads.length !== 1 ? "s" : ""}{" "}
            selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Selected
            </Button>
            <Button variant="outline" size="sm" onClick={onClearSelection}>
              <X className="h-4 w-4 mr-2" />
              Clear
            </Button>
          </div>
        </div>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Leads?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete <strong>{selectedLeads.length} leads</strong>.
              <br />
              <br />
              <strong>Don't worry!</strong> All leads will be moved to the trash
              and can be restored within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting
                ? "Deleting..."
                : `Delete ${selectedLeads.length} Leads`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
