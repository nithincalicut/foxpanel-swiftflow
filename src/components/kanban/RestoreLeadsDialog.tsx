import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface DeletedLead {
  id: string;
  lead_id: string;
  lead_data: any;
  lead_items: any[];
  deleted_by: string;
  deleted_at: string;
  restore_deadline: string;
}

interface RestoreLeadsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadRestored: () => void;
}

export function RestoreLeadsDialog({
  open,
  onOpenChange,
  onLeadRestored,
}: RestoreLeadsDialogProps) {
  const { user, userRole } = useAuth();
  const [deletedLeads, setDeletedLeads] = useState<DeletedLead[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchDeletedLeads();
    }
  }, [open]);

  const fetchDeletedLeads = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deleted_leads")
        .select("*")
        .order("deleted_at", { ascending: false });

      if (error) throw error;
      setDeletedLeads((data as any) || []);
    } catch (error: any) {
      toast.error("Failed to fetch deleted leads");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (deletedLead: DeletedLead) => {
    try {
      // Restore lead
      const { error: insertError } = await supabase
        .from("leads")
        .insert({
          id: deletedLead.lead_id,
          ...deletedLead.lead_data,
        });

      if (insertError) throw insertError;

      // Restore lead items
      if (deletedLead.lead_items && deletedLead.lead_items.length > 0) {
        const { error: itemsError } = await supabase
          .from("lead_items")
          .insert(deletedLead.lead_items);

        if (itemsError) throw itemsError;
      }

      // Remove from deleted_leads
      const { error: deleteError } = await supabase
        .from("deleted_leads")
        .delete()
        .eq("id", deletedLead.id);

      if (deleteError) throw deleteError;

      toast.success("Lead restored successfully");
      fetchDeletedLeads();
      onLeadRestored();
    } catch (error: any) {
      toast.error(error.message || "Failed to restore lead");
      console.error(error);
    }
  };

  const handlePermanentDelete = async (deletedLead: DeletedLead) => {
    if (!confirm("Permanently delete this lead? This cannot be undone.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("deleted_leads")
        .delete()
        .eq("id", deletedLead.id);

      if (error) throw error;

      toast.success("Lead permanently deleted");
      fetchDeletedLeads();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete lead");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Deleted Leads (Restore within 30 days)</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : deletedLeads.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deleted leads</p>
          ) : (
            <div className="space-y-3">
              {deletedLeads.map((deletedLead) => (
                <Card key={deletedLead.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm">
                          {deletedLead.lead_data.customer_name}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          {deletedLead.lead_data.order_id}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {deletedLead.lead_items?.length || 0} items
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Deleted {formatDistanceToNow(new Date(deletedLead.deleted_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-xs text-destructive mt-1">
                          Expires {formatDistanceToNow(new Date(deletedLead.restore_deadline), { addSuffix: true })}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(deletedLead)}
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                        {userRole === "admin" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handlePermanentDelete(deletedLead)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
