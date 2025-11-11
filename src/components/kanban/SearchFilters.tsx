import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { LeadStatus, ProductType } from "@/pages/Board";

interface SearchFiltersProps {
  onSearchChange: (search: string) => void;
  onProductTypeChange: (type: ProductType | "all") => void;
  onStatusChange: (status: LeadStatus | "all") => void;
  onClearFilters: () => void;
  totalLeads: number;
  filteredCount: number;
}

export function SearchFilters({
  onSearchChange,
  onProductTypeChange,
  onStatusChange,
  onClearFilters,
  totalLeads,
  filteredCount,
}: SearchFiltersProps) {
  const [search, setSearch] = useState("");
  const [productType, setProductType] = useState<ProductType | "all">("all");
  const [status, setStatus] = useState<LeadStatus | "all">("all");

  const handleSearchChange = (value: string) => {
    setSearch(value);
    onSearchChange(value);
  };

  const handleProductTypeChange = (value: ProductType | "all") => {
    setProductType(value);
    onProductTypeChange(value);
  };

  const handleStatusChange = (value: LeadStatus | "all") => {
    setStatus(value);
    onStatusChange(value);
  };

  const handleClear = () => {
    setSearch("");
    setProductType("all");
    setStatus("all");
    onClearFilters();
  };

  const hasActiveFilters = search || productType !== "all" || status !== "all";

  return (
    <div className="space-y-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name, order ID, or phone..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={productType} onValueChange={handleProductTypeChange}>
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

        <Select value={status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
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
          <Button variant="outline" onClick={handleClear} className="gap-2">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="text-sm text-muted-foreground">
          Showing {filteredCount} of {totalLeads} leads
        </div>
      )}
    </div>
  );
}
