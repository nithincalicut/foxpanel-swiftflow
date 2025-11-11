import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";

const formSchema = z.object({
  customer_name: z.string().min(1, "Name is required"),
  customer_email: z.string().email("Invalid email").optional().or(z.literal("")),
  customer_phone: z.string().min(10, "Phone number is required"),
  customer_address: z.string().min(1, "Address is required"),
  product_type: z.enum(["fp_pro", "fw", "ft"]),
  size: z.string().min(1, "Size is required"),
  custom_size: z.string().optional(),
  price_aed: z.string().min(1, "Price is required"),
  notes: z.string().optional(),
});

const sizeOptions = {
  fp_pro: ["20×20 cm", "20×30 cm"],
  fw: ["45×70 cm", "40×25 cm", "Custom Size"],
  ft: ["21×21 cm", "20×30 cm", "30×30 cm", "30×40 cm"],
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customer_name: "",
      customer_email: "",
      customer_phone: "",
      customer_address: "",
      product_type: "fp_pro",
      size: "",
      custom_size: "",
      price_aed: "",
      notes: "",
    },
  });

  const selectedProductType = form.watch("product_type");
  const selectedSize = form.watch("size");

  useEffect(() => {
    if (lead) {
      // Check if size is a custom size
      const isCustom = !sizeOptions[lead.product_type as keyof typeof sizeOptions].includes(lead.size);
      
      form.reset({
        customer_name: lead.customer_name || "",
        customer_email: lead.customer_email || "",
        customer_phone: lead.customer_phone || "",
        customer_address: lead.customer_address || "",
        product_type: lead.product_type,
        size: isCustom ? "Custom Size" : lead.size,
        custom_size: isCustom ? lead.size : "",
        price_aed: lead.price_aed?.toString() || "",
        notes: lead.notes || "",
      });
    }
  }, [lead, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!lead) return;

    setIsSubmitting(true);

    try {
      // Determine final size value
      const finalSize = values.size === "Custom Size" && values.custom_size 
        ? values.custom_size 
        : values.size;

      // Update lead
      const { error: updateError } = await supabase
        .from("leads")
        .update({
          customer_name: values.customer_name,
          customer_email: values.customer_email || null,
          customer_phone: values.customer_phone,
          customer_address: values.customer_address,
          product_type: values.product_type,
          size: finalSize,
          price_aed: parseFloat(values.price_aed),
          notes: values.notes || null,
        })
        .eq("id", lead.id);

      if (updateError) throw updateError;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter delivery address..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="product_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select product type" />
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
              name="size"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Size</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
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

            {selectedSize === "Custom Size" && (
              <FormField
                control={form.control}
                name="custom_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Custom Size</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter custom size (e.g., 50×60 cm)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="price_aed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (AED)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      placeholder="0.00" 
                      {...field} 
                    />
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
                    <Textarea
                      placeholder="Additional information..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
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
      </DialogContent>
    </Dialog>
  );
}
