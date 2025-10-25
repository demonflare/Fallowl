import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "./DateRangePicker";
import { DateRange } from "react-day-picker";

interface FilterConfig {
  type: 'text' | 'select' | 'dateRange';
  label: string;
  field: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
}

interface AdvancedFiltersProps {
  filters: Record<string, any>;
  onChange: (filters: Record<string, any>) => void;
  config: FilterConfig[];
  showFilters: boolean;
  onToggle: () => void;
}

export function AdvancedFilters({ filters, onChange, config, showFilters, onToggle }: AdvancedFiltersProps) {
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (value === null || value === undefined || value === '' || value === 'all') {
      return false;
    }
    if (typeof value === 'object' && 'from' in value && !value.from) {
      return false;
    }
    return true;
  }).length;

  const handleFilterChange = (field: string, value: any) => {
    onChange({ ...filters, [field]: value });
  };

  const clearAllFilters = () => {
    const clearedFilters: Record<string, any> = {};
    config.forEach(c => {
      clearedFilters[c.field] = null;
    });
    onChange(clearedFilters);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          data-testid="button-toggle-filters"
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAllFilters}
            data-testid="button-clear-all-filters"
          >
            <X className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Advanced Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.map((filterConfig) => (
                <div key={filterConfig.field} className="space-y-2">
                  <label className="text-sm font-medium">{filterConfig.label}</label>
                  {filterConfig.type === 'text' && (
                    <Input
                      placeholder={filterConfig.placeholder || `Filter by ${filterConfig.label.toLowerCase()}`}
                      value={filters[filterConfig.field] || ''}
                      onChange={(e) => handleFilterChange(filterConfig.field, e.target.value)}
                      data-testid={`input-filter-${filterConfig.field}`}
                    />
                  )}
                  {filterConfig.type === 'select' && (
                    <Select
                      value={filters[filterConfig.field] || 'all'}
                      onValueChange={(value) => handleFilterChange(filterConfig.field, value === 'all' ? null : value)}
                    >
                      <SelectTrigger data-testid={`select-filter-${filterConfig.field}`}>
                        <SelectValue placeholder={`Select ${filterConfig.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {filterConfig.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {filterConfig.type === 'dateRange' && (
                    <DateRangePicker
                      value={filters[filterConfig.field]}
                      onChange={(range) => handleFilterChange(filterConfig.field, range)}
                      placeholder={filterConfig.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
