import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, X } from "lucide-react";
import { LeadStatus, ProductType } from "@/pages/Board";

interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedProductType: ProductType | "all";
  onProductTypeChange: (value: ProductType | "all") => void;
  selectedStatus: LeadStatus | "all";
  onStatusChange: (value: LeadStatus | "all") => void;
  onClearFilters: () => void;
  totalLeads: number;
  filteredCount: number;
}

export function SearchFilters({
  searchTerm,
  onSearchChange,
  selectedProductType,
  onProductTypeChange,
  selectedStatus,
  onStatusChange,
  onClearFilters,
  totalLeads,
  filteredCount,
}: SearchFiltersProps) {
  const hasActiveFilters = searchTerm || selectedProductType !== "all" || selectedStatus !== "all";

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, order ID, or phone..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={selectedProductType} onValueChange={onProductTypeChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Product Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Products</SelectItem>
            <SelectItem value="fp_pro">FP-PRO</SelectItem>
            <SelectItem value="fw">FW</SelectItem>
            <SelectItem value="ft">FT</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Stages</SelectItem>
            <SelectItem value="leads">Leads</SelectItem>
            <SelectItem value="photos_received">Photos Received</SelectItem>
            <SelectItem value="mockup_done">Mockup Done</SelectItem>
            <SelectItem value="price_shared">Price Shared</SelectItem>
            <SelectItem value="payment_done">Payment Done</SelectItem>
            <SelectItem value="production">Production</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <p className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalLeads} leads
        </p>
      )}
    </div>
  );
}
