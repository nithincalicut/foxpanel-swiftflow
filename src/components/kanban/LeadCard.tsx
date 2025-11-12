import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/pages/Board";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Phone, Mail, Package, Edit, ShoppingCart, Truck, Store, CreditCard, Banknote, AlertTriangle, MapPin, Calendar } from "lucide-react";
import { format } from "date-fns";

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

  // Check if payment info is missing for payment_done, production, or delivered stages
  const needsPaymentInfo = ['payment_done', 'production', 'delivered'].includes(lead.status);
  const missingPaymentInfo = needsPaymentInfo && (!lead.payment_type || !lead.delivery_method);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...dragListeners}
      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
        isSelected ? 'ring-2 ring-primary' : ''
      } ${missingPaymentInfo ? 'border-2 border-amber-500/50' : ''}`}
    >
      <CardHeader className="p-3 pb-2">
        {missingPaymentInfo && (
          <div className="mb-2 flex items-center gap-1.5 p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <span className="text-xs font-medium text-amber-700">
              {!lead.payment_type && !lead.delivery_method 
                ? 'Payment & delivery info required'
                : !lead.payment_type 
                ? 'Payment type required'
                : 'Delivery method required'}
            </span>
          </div>
        )}
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

        {(lead.payment_type || lead.delivery_method) && (
          <div className="mt-3 p-2 rounded-md bg-primary/10 border border-primary/20 space-y-1.5">
            {lead.payment_type && (
              <div className="flex items-center gap-1.5 text-xs">
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <Badge variant="secondary" className="text-xs font-semibold bg-primary/20 text-primary border-primary/30">
                  {lead.payment_type === 'full_payment' ? 'Full Payment' : 
                   lead.payment_type === 'partial_payment' ? '50% Payment' : 'COD'}
                </Badge>
              </div>
            )}

            {lead.delivery_method && (
              <div className="flex items-center gap-1.5 text-xs">
                {lead.delivery_method === 'courier' ? (
                  <Truck className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <Store className="h-3.5 w-3.5 text-primary" />
                )}
                <Badge variant="outline" className="text-xs font-semibold border-primary/30 text-primary">
                  {lead.delivery_method === 'courier' ? 'Courier' : 'Store Collection'}
                </Badge>
              </div>
            )}
          </div>
        )}

        {lead.delivery_method === 'courier' && (lead.tracking_number || lead.tracking_status) && (
          <div className="mt-2 p-2 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-1.5">
            {lead.tracking_number && (
              <div className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">
                  {lead.tracking_number}
                </span>
              </div>
            )}
            
            {lead.tracking_status && (
              <div className="flex items-center gap-1.5 text-xs">
                <Badge 
                  variant={lead.tracking_status === 'delivered' ? 'default' : 'secondary'}
                  className={`text-xs font-semibold ${
                    lead.tracking_status === 'delivered' 
                      ? 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700'
                      : lead.tracking_status === 'failed'
                      ? 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700'
                      : 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700'
                  }`}
                >
                  {lead.tracking_status === 'pending_pickup' && 'Pending Pickup'}
                  {lead.tracking_status === 'in_transit' && 'In Transit'}
                  {lead.tracking_status === 'out_for_delivery' && 'Out for Delivery'}
                  {lead.tracking_status === 'delivered' && '✓ Delivered'}
                  {lead.tracking_status === 'failed' && 'Failed Delivery'}
                </Badge>
              </div>
            )}
          </div>
        )}

        {lead.packing_date && (
          <div className="mt-2 p-2 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span className="font-semibold text-purple-700 dark:text-purple-300">
                Packed: {format(new Date(lead.packing_date), 'MMM dd, yyyy')}
              </span>
            </div>
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
