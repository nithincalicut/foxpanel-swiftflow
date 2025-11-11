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
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

interface DeleteAllLeadsDialogProps {
  onLeadsDeleted: () => void;
  totalLeads: number;
}

export function DeleteAllLeadsDialog({
  onLeadsDeleted,
  totalLeads,
}: DeleteAllLeadsDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAll = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      // Get all leads
      const { data: leads, error: fetchError } = await supabase
        .from("leads")
        .select(`
          *,
          lead_items (*)
        `);

      if (fetchError) throw fetchError;

      if (!leads || leads.length === 0) {
        toast.info("No leads to delete");
        setOpen(false);
        return;
      }

      // Soft delete all leads to deleted_leads table
      const deletedLeadsData = leads.map((lead) => ({
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
        .insert(deletedLeadsData);

      if (insertError) throw insertError;

      // Delete all leads from leads table
      const { error: deleteError } = await supabase
        .from("leads")
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) throw deleteError;

      toast.success(`${leads.length} leads deleted (can be restored within 30 days)`);
      setOpen(false);
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
      <Button
        variant="destructive"
        onClick={() => setOpen(true)}
        disabled={totalLeads === 0}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Delete All Leads
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Leads?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all <strong>{totalLeads} leads</strong> from the board.
              <br /><br />
              <strong>Don't worry!</strong> All leads will be moved to the trash and can be restored within 30 days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : `Delete ${totalLeads} Leads`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
