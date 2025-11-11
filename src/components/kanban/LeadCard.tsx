import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/pages/Board";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Mail, Package, Edit, ShoppingCart } from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  isDragging?: boolean;
  onEdit?: (lead: Lead) => void;
  isSelected?: boolean;
  onSelect?: (leadId: string, selected: boolean) => void;
  selectionMode?: boolean;
}

const productLabels = {
  fp_pro: "FP-PRO",
  fw: "FW",
  ft: "FT",
};

export function LeadCard({ lead, isDragging = false, onEdit, isSelected = false, onSelect, selectionMode = false }: LeadCardProps) {
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

  // Separate drag listeners from the edit button
  const { onClick, ...dragListeners } = listeners || {};

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...dragListeners}
      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
    >
      <CardHeader className="p-3 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {selectionMode && onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) => {
                  console.log('Checkbox clicked:', { leadId: lead.id, checked, isSelected });
                  onSelect(lead.id, !!checked);
                }}
                onClick={(e) => e.stopPropagation()}
                className="mt-0.5"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-sm truncate">{lead.customer_name}</h4>
              <p className="text-xs text-muted-foreground font-mono">{lead.order_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {lead.lead_items && lead.lead_items.length > 0 && (
              <Badge variant="secondary" className="text-xs shrink-0">
                <ShoppingCart className="h-3 w-3 mr-1" />
                {lead.lead_items.length}
              </Badge>
            )}
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-accent cursor-pointer"
                onPointerDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log('Edit button clicked for lead:', lead.id);
                  onEdit(lead);
                }}
                title="Edit lead"
              >
                <Edit className="h-3 w-3 pointer-events-none" />
              </Button>
            )}
          </div>
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
        
        {lead.lead_items && lead.lead_items.length > 0 && (
          <div className="mt-2 space-y-1">
            {lead.lead_items.map((item, index) => (
              <div key={item.id} className="flex items-center gap-1.5 text-xs">
                <Package className="h-3 w-3 shrink-0 text-muted-foreground" />
                <Badge variant="outline" className="text-xs">
                  {productLabels[item.product_type]}
                </Badge>
                <span className="text-muted-foreground">{item.size}</span>
                {item.quantity > 1 && (
                  <span className="text-muted-foreground">×{item.quantity}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {lead.lead_items && lead.lead_items.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary mt-2">
            <span>
              AED {lead.lead_items.reduce((sum, item) => sum + (parseFloat(item.price_aed as any) || 0) * item.quantity, 0).toFixed(2)}
            </span>
          </div>
        )}
        
        {lead.notes && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {lead.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
