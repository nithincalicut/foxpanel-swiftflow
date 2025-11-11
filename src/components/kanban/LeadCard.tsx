import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/pages/Board";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Package } from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
}

const productLabels = {
  fp_pro: "FP-PRO",
  fw: "FW",
  ft: "FT",
};

export function LeadCard({ lead, isDragging = false }: LeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging || isSortableDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{lead.customer_name}</h4>
            <p className="text-xs text-muted-foreground font-mono">{lead.order_id}</p>
          </div>
          <Badge variant="secondary" className="text-xs shrink-0">
            {productLabels[lead.product_type]}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-0 space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="truncate">{lead.customer_phone}</span>
        </div>
        
        {lead.customer_email && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{lead.customer_email}</span>
          </div>
        )}
        
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package className="h-3 w-3 shrink-0" />
          <span>Size: {lead.size}</span>
        </div>
        
        {lead.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {lead.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
