import { useState, useEffect, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { KanbanColumn } from "@/components/kanban/KanbanColumn";
import { LeadCard } from "@/components/kanban/LeadCard";
import { CreateLeadDialog } from "@/components/kanban/CreateLeadDialog";
import { EditLeadDialog } from "@/components/kanban/EditLeadDialog";
import { SearchFilters } from "@/components/kanban/SearchFilters";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export type LeadStatus = 
  | "leads"
  | "photos_received"
  | "mockup_done"
  | "price_shared"
  | "payment_done"
  | "production"
  | "delivered";

export type ProductType = "fp_pro" | "fw" | "ft";

export interface Lead {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  customer_address: string | null;
  product_type: ProductType;
  size: string;
  price_aed: number | null;
  status: LeadStatus;
  assigned_to: string | null;
  created_by: string;
  last_status_change: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const columns: { id: LeadStatus; title: string }[] = [
  { id: "leads", title: "Leads" },
  { id: "photos_received", title: "Photos Received" },
  { id: "mockup_done", title: "Mockup Done" },
  { id: "price_shared", title: "Price Shared" },
  { id: "payment_done", title: "Payment Done" },
  { id: "production", title: "Production" },
  { id: "delivered", title: "Delivered" },
];

export default function Board() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [productTypeFilter, setProductTypeFilter] = useState<ProductType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");

  useEffect(() => {
    if (user) {
      fetchLeads();
      subscribeToLeads();
    }
  }, [user]);

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to fetch leads");
      console.error(error);
    } else {
      setLeads(data || []);
    }
  };

  const subscribeToLeads = () => {
    const channel = supabase
      .channel("leads-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "leads",
        },
        () => {
          fetchLeads();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    // Optimistic update
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    // Update in database
    const { error } = await supabase
      .from("leads")
      .update({ status: newStatus })
      .eq("id", leadId);

    if (error) {
      toast.error("Failed to update lead status");
      console.error(error);
      // Revert optimistic update
      fetchLeads();
    } else {
      toast.success("Lead status updated");
    }
  };

  const handleEditLead = (lead: Lead) => {
    setLeadToEdit(lead);
    setIsEditDialogOpen(true);
  };

  // Filter leads based on search and filters
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        !searchTerm ||
        lead.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_phone.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesProductType =
        productTypeFilter === "all" || lead.product_type === productTypeFilter;

      const matchesStatus = statusFilter === "all" || lead.status === statusFilter;

      return matchesSearch && matchesProductType && matchesStatus;
    });
  }, [leads, searchTerm, productTypeFilter, statusFilter]);

  const handleClearFilters = () => {
    setSearchTerm("");
    setProductTypeFilter("all");
    setStatusFilter("all");
  };

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold">Sales Pipeline</h2>
          <p className="text-muted-foreground">
            Manage and track your leads through the sales process
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Lead
        </Button>
      </div>

      <SearchFilters
        onSearchChange={setSearchTerm}
        onProductTypeChange={setProductTypeFilter}
        onStatusChange={setStatusFilter}
        onClearFilters={handleClearFilters}
        totalLeads={leads.length}
        filteredCount={filteredLeads.length}
      />

      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              leads={filteredLeads.filter((lead) => lead.status === column.id)}
              onEditLead={handleEditLead}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead && <LeadCard lead={activeLead} isDragging />}
        </DragOverlay>
      </DndContext>

      <CreateLeadDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onLeadCreated={fetchLeads}
      />

      <EditLeadDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onLeadUpdated={fetchLeads}
        lead={leadToEdit}
      />
    </DashboardLayout>
  );
}
