import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const itemSchema = z.object({
  id: z.string().optional(),
  product_type: z.enum(["fp_pro", "fw", "ft"]),
  size: z.string().min(1, "Size is required"),
  custom_size: z.string().optional(),
  quantity: z.string().min(1, "Quantity is required"),
  price_aed: z.string().min(1, "Price is required"),
});

const createFormSchema = (status?: string) => {
  const needsPaymentInfo = status === 'payment_done' || status === 'production' || status === 'delivered';
  
  return z.object({
    customer_name: z.string().min(1, "Name is required"),
    customer_email: z.string().email("Invalid email").optional().or(z.literal("")),
    customer_phone: z.string().min(10, "Phone number is required"),
    customer_address: z.string().optional(),
    notes: z.string().optional(),
    items: z.array(itemSchema).min(1, "At least one item is required"),
    payment_type: needsPaymentInfo 
      ? z.enum(["full_payment", "partial_payment", "cod"], {
          required_error: "Payment type is required for this stage"
        })
      : z.enum(["full_payment", "partial_payment", "cod"]).optional(),
    delivery_method: needsPaymentInfo
      ? z.enum(["courier", "store_collection"], {
          required_error: "Delivery method is required for this stage"
        })
      : z.enum(["courier", "store_collection"]).optional(),
    tracking_number: z.string().optional(),
    tracking_status: z.enum(["pending_pickup", "in_transit", "out_for_delivery", "delivered", "failed"]).optional(),
    packing_date: z.string().optional(),
  });
};

type FormSchema = z.infer<ReturnType<typeof createFormSchema>>;

const sizeOptions = {
  fp_pro: ["20×20 cm", "20×30 cm"],
  fw: ["45×70 cm", "40×25 cm", "Custom Size"],
  ft: ["21×21 cm", "20×30 cm", "30×30 cm", "30×40 cm"],
};

const statusLabels: Record<string, string> = {
  leads: "Leads",
  photos_received: "Photos Received",
  mockup_done: "Mockup Done",
  price_shared: "Price Shared",
  payment_done: "Payment Done",
  production: "Production",
  delivered: "Delivered",
};

interface EditLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadUpdated: () => void;
  lead: any;
}

export function EditLeadDialog({
  open,
  onOpenChange,
  onLeadUpdated,
  lead,
}: EditLeadDialogProps) {
  const { user, userRole } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leadHistory, setLeadHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const form = useForm<FormSchema>({
    resolver: zodResolver(createFormSchema(lead?.status)),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      customer_address: "",
      notes: "",
      payment_type: undefined,
      delivery_method: undefined,
      tracking_number: "",
      tracking_status: undefined,
      packing_date: "",
      items: [
        {
          product_type: "fp_pro",
          size: "",
          custom_size: "",
          quantity: "1",
          price_aed: "",
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (lead && open) {
      const items = lead.lead_items?.map((item: any) => {
        const isCustom = !sizeOptions[item.product_type as keyof typeof sizeOptions].includes(item.size);
        
        return {
          id: item.id,
          product_type: item.product_type,
          size: isCustom ? "Custom Size" : item.size,
          custom_size: isCustom ? item.size : "",
          quantity: item.quantity.toString(),
          price_aed: item.price_aed?.toString() || "",
        };
      }) || [];

      form.reset({
        customer_name: lead.customer_name || "",
        customer_email: lead.customer_email || "",
        customer_phone: lead.customer_phone || "",
        customer_address: lead.customer_address || "",
        notes: lead.notes || "",
        payment_type: lead.payment_type || undefined,
        delivery_method: lead.delivery_method || undefined,
        tracking_number: lead.tracking_number || "",
        tracking_status: lead.tracking_status || undefined,
        packing_date: lead.packing_date || "",
        items: items.length > 0 ? items : [
          {
            product_type: "fp_pro",
            size: "",
            custom_size: "",
            quantity: "1",
            price_aed: "",
          },
        ],
      });
      
      fetchLeadHistory();
    }
  }, [lead, open, form]);

  const fetchLeadHistory = async () => {
    if (!lead) return;
    
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from("lead_history")
        .select("*")
        .eq("lead_id", lead.id)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      setLeadHistory(data || []);
    } catch (error) {
      console.error("Error fetching lead history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const onSubmit = async (values: FormSchema) => {
    if (!lead) return;

    setIsSubmitting(true);

    try {
      // Update lead
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          customer_name: values.customer_name,
          customer_email: values.customer_email || null,
          customer_phone: values.customer_phone,
          customer_address: values.customer_address,
          notes: values.notes || null,
          payment_type: values.payment_type || null,
          delivery_method: values.delivery_method || null,
          tracking_number: values.tracking_number || null,
          tracking_status: values.tracking_status || null,
          packing_date: values.packing_date || null,
          tracking_updated_at: values.tracking_number || values.tracking_status ? new Date().toISOString() : null,
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

      // Get existing item IDs
      const existingItemIds = values.items
        .filter(item => item.id)
        .map(item => item.id);

      // Delete removed items
      if (lead.lead_items) {
        const itemsToDelete = lead.lead_items
          .filter((item: any) => !existingItemIds.includes(item.id))
          .map((item: any) => item.id);

        if (itemsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from("lead_items")
            .delete()
            .in("id", itemsToDelete);

          if (deleteError) throw deleteError;
        }
      }

      // Update or insert items
      for (const item of values.items) {
        const finalSize = item.size === "Custom Size" && item.custom_size 
          ? item.custom_size 
          : item.size;

        const itemData = {
          lead_id: lead.id,
          product_type: item.product_type,
          size: finalSize,
          quantity: parseInt(item.quantity),
          price_aed: parseFloat(item.price_aed),
        };

        if (item.id) {
          // Update existing item
          const { error: updateItemError } = await supabase
            .from("lead_items")
            .update(itemData)
            .eq("id", item.id);

          if (updateItemError) throw updateItemError;
        } else {
          // Insert new item
          const { error: insertItemError } = await supabase
            .from("lead_items")
            .insert(itemData);

          if (insertItemError) throw insertItemError;
        }
      }

      toast.success("Lead updated successfully");
      form.reset();
      onOpenChange(false);
      onLeadUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to update lead");
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!lead?.id) return;
    
    try {
      // Soft delete: Move to deleted_leads table
      const { error: insertError } = await supabase
        .from("deleted_leads")
        .insert({
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
            payment_type: lead.payment_type,
            delivery_method: lead.delivery_method,
            created_at: lead.created_at,
            updated_at: lead.updated_at,
          },
          lead_items: lead.lead_items || [],
          deleted_by: user?.id,
        });

      if (insertError) throw insertError;

      // Now delete from leads table
      const { error: deleteError } = await supabase
        .from("leads")
        .delete()
        .eq("id", lead.id);

      if (deleteError) throw deleteError;

      toast.success("Lead deleted (can be restored within 30 days)");
      setShowDeleteDialog(false);
      onOpenChange(false);
      onLeadUpdated();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete lead");
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customer_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="customer_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="customer_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customer_address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter delivery address..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional information..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment & Delivery Information - SALES TEAM & ADMIN ONLY */}
                {(userRole === 'sales_staff' || userRole === 'admin') && 
                 (lead?.status === 'payment_done' || lead?.status === 'production' || lead?.status === 'delivered') && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-primary">Payment & Delivery Information</h3>
                    <div className="grid grid-cols-2 gap-4 p-4 border-2 border-primary/20 rounded-lg bg-primary/5">
                      <FormField
                        control={form.control}
                        name="payment_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-primary font-semibold">Payment Type *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-primary/30">
                                  <SelectValue placeholder="Select payment type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="full_payment">Full Payment</SelectItem>
                                <SelectItem value="partial_payment">50% Payment</SelectItem>
                                <SelectItem value="cod">COD</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="delivery_method"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-primary font-semibold">Delivery Method *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="border-primary/30">
                                  <SelectValue placeholder="Select delivery method" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="courier">Courier Delivery</SelectItem>
                                <SelectItem value="store_collection">Store Collection</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Courier Tracking Information - PRODUCTION TEAM & ADMIN ONLY */}
                {(userRole === 'production_manager' || userRole === 'admin') && 
                 form.watch('delivery_method') === 'courier' && 
                 (lead?.status === 'production' || lead?.status === 'delivered') && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
                      Production & Shipping Details
                    </h3>
                    <div className="grid grid-cols-3 gap-4 p-4 border-2 border-green-200 dark:border-green-800 rounded-lg bg-green-50 dark:bg-green-950/30">
                        <FormField
                          control={form.control}
                          name="tracking_number"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-green-700 dark:text-green-300 font-semibold">Tracking Number</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Enter tracking number..." 
                                  {...field} 
                                  className="border-green-300 dark:border-green-700"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="tracking_status"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-green-700 dark:text-green-300 font-semibold">Tracking Status</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger className="border-green-300 dark:border-green-700">
                                    <SelectValue placeholder="Select status..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="pending_pickup">Pending Pickup</SelectItem>
                                  <SelectItem value="in_transit">In Transit</SelectItem>
                                  <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                                  <SelectItem value="delivered">Delivered</SelectItem>
                                  <SelectItem value="failed">Failed Delivery</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="packing_date"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-green-700 dark:text-green-300 font-semibold">
                                Packing Date
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  type="date"
                                  {...field} 
                                  className="border-green-300 dark:border-green-700"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}

                {/* Order Items */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Order Items</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          product_type: "fp_pro",
                          size: "",
                          custom_size: "",
                          quantity: "1",
                          price_aed: "",
                        })
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>

                  {fields.map((field, index) => {
                    const selectedProductType = form.watch(`items.${index}.product_type`);
                    const selectedSize = form.watch(`items.${index}.size`);

                    return (
                      <Card key={field.id}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium">Item {index + 1}</h4>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.product_type`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Product Type</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select product" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="fp_pro">FP-PRO</SelectItem>
                                      <SelectItem value="fw">FW</SelectItem>
                                      <SelectItem value="ft">FT</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.size`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Size</FormLabel>
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select size" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {sizeOptions[selectedProductType].map((size) => (
                                        <SelectItem key={size} value={size}>
                                          {size}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          {selectedSize === "Custom Size" && (
                            <FormField
                              control={form.control}
                              name={`items.${index}.custom_size`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Custom Size</FormLabel>
                                  <FormControl>
                                    <Input placeholder="e.g., 50×60 cm" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity</FormLabel>
                                  <FormControl>
                                    <Input type="number" min="1" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.price_aed`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price (AED)</FormLabel>
                                  <FormControl>
                                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setShowDeleteDialog(true)}
                    className="mr-auto"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting ? "Updating..." : "Update Lead"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>

          <div className="space-y-4">
            <Separator className="lg:hidden" />
            <h3 className="text-lg font-semibold">Activity Timeline</h3>
            {loadingHistory ? (
              <p className="text-sm text-muted-foreground">Loading history...</p>
            ) : leadHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            ) : (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-4">
                  {leadHistory.map((history, index) => (
                    <div key={history.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="h-2 w-2 rounded-full bg-primary" />
                        {index < leadHistory.length - 1 && (
                          <div className="w-px h-full bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          {history.old_status && (
                            <>
                              <Badge variant="outline" className="text-xs">
                                {statusLabels[history.old_status] || history.old_status}
                              </Badge>
                              <span className="text-xs text-muted-foreground">→</span>
                            </>
                          )}
                          <Badge className="text-xs">
                            {statusLabels[history.new_status] || history.new_status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(history.changed_at), { addSuffix: true })}
                        </p>
                        {history.notes && (
                          <p className="text-sm mt-2 text-muted-foreground">{history.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </div>
      </DialogContent>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Lead</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this lead? This action cannot be undone.
              This will permanently delete the lead for {lead?.customer_name} (Order: {lead?.order_id}).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
