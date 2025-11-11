import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { LeadCard } from "./LeadCard";
import { Lead } from "@/pages/Board";
import { Card } from "@/components/ui/card";

interface KanbanColumnProps {
  id: string;
  title: string;
  leads: Lead[];
  onEditLead?: (lead: Lead) => void;
}

export function KanbanColumn({ id, title, leads, onEditLead }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div className="flex flex-col min-w-[280px]">
      <div className="mb-3">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground">
          {title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">{leads.length} leads</p>
      </div>
      
      <Card ref={setNodeRef} className="flex-1 p-3 bg-muted/20 min-h-[400px]">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {leads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onEdit={onEditLead} />
            ))}
          </div>
        </SortableContext>
      </Card>
    </div>
  );
}
