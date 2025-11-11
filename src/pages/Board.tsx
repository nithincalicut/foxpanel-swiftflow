import { useState, useEffect, useMemo } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners } from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardLayout } from "@/components/DashboardLayout";
import { ResizableKanbanColumn } from "@/components/kanban/ResizableKanbanColumn";
import { LeadCard } from "@/components/kanban/LeadCard";
import { CreateLeadDialog } from "@/components/kanban/CreateLeadDialog";
import { EditLeadDialog } from "@/components/kanban/EditLeadDialog";
import { RestoreLeadsDialog } from "@/components/kanban/RestoreLeadsDialog";
import { DeleteAllLeadsDialog } from "@/components/kanban/DeleteAllLeadsDialog";
import { BulkActionsBar } from "@/components/kanban/BulkActionsBar";
import { SearchFilters } from "@/components/kanban/SearchFilters";
import { Button } from "@/components/ui/button";
import { Plus, RotateCcw, CheckSquare } from "lucide-react";
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

export interface LeadItem {
  id: string;
  lead_id: string;
  product_type: ProductType;
  size: string;
  quantity: number;
  price_aed: number | null;
  created_at: string;
  updated_at: string;
}

export type PaymentType = "full_payment" | "partial_payment" | "cod";
export type DeliveryMethod = "courier" | "store_collection";

export interface Lead {
  id: string;
  order_id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string;
  customer_address: string | null;
  status: LeadStatus;
  assigned_to: string | null;
  created_by: string;
  last_status_change: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  payment_type: PaymentType | null;
  delivery_method: DeliveryMethod | null;
  lead_items?: LeadItem[];
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
  const { user, userRole } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [leadToEdit, setLeadToEdit] = useState<Lead | null>(null);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<ProductType | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | "all">("all");
  const [showMissingPaymentOnly, setShowMissingPaymentOnly] = useState(false);

  // Column width and view states
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [minimizedColumns, setMinimizedColumns] = useState<Set<string>>(new Set());
  const [maximizedColumn, setMaximizedColumn] = useState<string | null>(null);

  // Bulk selection states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchLeads();
      subscribeToLeads();
      loadUserPreferences();
    }
  }, [user]);

  const loadUserPreferences = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_preferences")
      .select("preferences")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && data?.preferences) {
      const prefs = data.preferences as any;
      if (prefs.columnWidths) {
        setColumnWidths(prefs.columnWidths);
      }
    } else {
      // Set default widths
      const defaultWidths: Record<string, number> = {};
      columns.forEach(col => {
        defaultWidths[col.id] = 320;
      });
      setColumnWidths(defaultWidths);
    }
  };

  const saveUserPreferences = async (widths: Record<string, number>) => {
    if (!user) return;

    await supabase
      .from("user_preferences")
      .upsert({
        user_id: user.id,
        preferences: { columnWidths: widths },
      });
  };

  const fetchLeads = async () => {
    const { data, error } = await supabase
      .from("leads")
      .select(`
        *,
        lead_items (*)
      `)
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
    
    // Check if dropped on a column or another lead
    let newStatus: LeadStatus;
    const overIdStr = over.id as string;
    
    // If over.id is a valid status, use it directly
    const validStatuses: LeadStatus[] = ["leads", "photos_received", "mockup_done", "price_shared", "payment_done", "production", "delivered"];
    if (validStatuses.includes(overIdStr as LeadStatus)) {
      newStatus = overIdStr as LeadStatus;
    } else {
      // Otherwise, it's a lead ID - find that lead's status
      const targetLead = leads.find((l) => l.id === overIdStr);
      if (!targetLead) return;
      newStatus = targetLead.status;
    }

    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.status === newStatus) return;

    // Validate payment info when moving to production or delivered
    if ((newStatus === 'production' || newStatus === 'delivered') && !lead.payment_type) {
      toast.error("Please set payment type before moving to " + (newStatus === 'production' ? 'Production' : 'Delivered'));
      return;
    }

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
    console.log('handleEditLead called with lead:', lead);
    setLeadToEdit(lead);
    setIsEditDialogOpen(true);
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setSelectedProductType("all");
    setSelectedStatus("all");
    setShowMissingPaymentOnly(false);
  };

  const handleWidthChange = (id: string, width: number) => {
    const newWidths = { ...columnWidths, [id]: width };
    setColumnWidths(newWidths);
    saveUserPreferences(newWidths);
  };

  const handleMinimize = (id: string) => {
    if (maximizedColumn === id) {
      setMaximizedColumn(null);
    }
    setMinimizedColumns(prev => new Set(prev).add(id));
  };

  const handleMaximize = (id: string) => {
    setMinimizedColumns(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    setMaximizedColumn(id);
  };

  const handleNormalView = (id: string) => {
    setMinimizedColumns(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    setMaximizedColumn(null);
  };

  const handleLeadSelect = (leadId: string, selected: boolean) => {
    console.log('Lead selection changed:', { leadId, selected, selectionMode });
    setSelectedLeads(prev => {
      const newSelection = selected ? [...prev, leadId] : prev.filter(id => id !== leadId);
      console.log('New selected leads:', newSelection);
      return newSelection;
    });
  };

  const handleClearSelection = () => {
    setSelectedLeads([]);
    setSelectionMode(false);
  };

  // Filter leads based on search and filters
  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const matchesSearch =
        !searchTerm ||
        lead.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.customer_phone.includes(searchTerm);

      const matchesProductType =
        selectedProductType === "all" || 
        (lead.lead_items && lead.lead_items.some(item => item.product_type === selectedProductType));

      const matchesStatus =
        selectedStatus === "all" || lead.status === selectedStatus;

      const needsPaymentInfo = ['payment_done', 'production', 'delivered'].includes(lead.status);
      const missingPaymentInfo = needsPaymentInfo && (!lead.payment_type || !lead.delivery_method);
      const matchesPaymentFilter = !showMissingPaymentOnly || missingPaymentInfo;

      return matchesSearch && matchesProductType && matchesStatus && matchesPaymentFilter;
    });
  }, [leads, searchTerm, selectedProductType, selectedStatus, showMissingPaymentOnly]);

  // Count leads missing payment info
  const missingPaymentInfoCount = useMemo(() => {
    return leads.filter(lead => {
      const needsPaymentInfo = ['payment_done', 'production', 'delivered'].includes(lead.status);
      return needsPaymentInfo && (!lead.payment_type || !lead.delivery_method);
    }).length;
  }, [leads]);

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold">Sales Pipeline</h2>
        <div className="flex gap-2">
          <Button
            variant={selectionMode ? "default" : "outline"}
            onClick={() => {
              const newMode = !selectionMode;
              console.log('Selection mode toggled:', newMode);
              setSelectionMode(newMode);
              if (selectionMode) {
                setSelectedLeads([]);
              }
            }}
          >
            <CheckSquare className="mr-2 h-4 w-4" />
            {selectionMode ? "Exit Selection" : "Select Leads"}
          </Button>
          <DeleteAllLeadsDialog
            onLeadsDeleted={fetchLeads}
            totalLeads={leads.length}
          />
          {userRole === "admin" && (
            <Button variant="outline" onClick={() => setIsRestoreDialogOpen(true)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restore Leads
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Lead
          </Button>
        </div>
      </div>

      <SearchFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedProductType={selectedProductType}
        onProductTypeChange={setSelectedProductType}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onClearFilters={handleClearFilters}
        totalLeads={leads.length}
        filteredCount={filteredLeads.length}
        missingPaymentInfoCount={missingPaymentInfoCount}
        showMissingPaymentOnly={showMissingPaymentOnly}
        onToggleMissingPayment={() => setShowMissingPaymentOnly(!showMissingPaymentOnly)}
      />

      <DndContext
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <ResizableKanbanColumn
              key={column.id}
              id={column.id}
              title={column.title}
              leads={filteredLeads.filter((lead) => lead.status === column.id)}
              onEditLead={handleEditLead}
              width={columnWidths[column.id] || 320}
              onWidthChange={handleWidthChange}
              onMinimize={() => handleMinimize(column.id)}
              onMaximize={() => handleNormalView(column.id)}
              isMinimized={minimizedColumns.has(column.id)}
              isMaximized={maximizedColumn === column.id}
              selectionMode={selectionMode}
              selectedLeads={selectedLeads}
              onLeadSelect={handleLeadSelect}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead && <LeadCard lead={activeLead} isDragging />}
        </DragOverlay>
      </DndContext>

      <BulkActionsBar
        selectedLeads={selectedLeads}
        leads={leads}
        onClearSelection={handleClearSelection}
        onLeadsDeleted={fetchLeads}
      />

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

      <RestoreLeadsDialog
        open={isRestoreDialogOpen}
        onOpenChange={setIsRestoreDialogOpen}
        onLeadRestored={fetchLeads}
      />
    </DashboardLayout>
  );
}
