import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, X } from "lucide-react";

export interface SessionFilters {
  dateFrom: string;
  dateTo: string;
  entityFilter: string;  // therapist or client id, "all" for none
  sortBy: 'date-desc' | 'date-asc' | 'name-asc';
}

export const defaultFilters: SessionFilters = { dateFrom: "", dateTo: "", entityFilter: "all", sortBy: 'date-desc' };

interface Props {
  filters: SessionFilters;
  onChange: (f: SessionFilters) => void;
  /** "client" means filter by client (used by therapist & admin); "therapist" means filter by therapist (used by client) */
  entityType: 'client' | 'therapist';
  /** List of {id,name} for the dropdown */
  entityOptions: { id: string; name: string }[];
}

export function SessionFilterBar({ filters, onChange, entityType, entityOptions }: Props) {
  const set = (k: keyof SessionFilters, v: any) => onChange({ ...filters, [k]: v });
  const hasFilters = filters.dateFrom || filters.dateTo || filters.entityFilter !== 'all';
  const clear = () => onChange(defaultFilters);

  return (
    <Card className="p-3 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="w-4 h-4 text-primary" />
        <h4 className="text-sm font-semibold text-foreground">Filter & Sort</h4>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear} className="ml-auto h-7">
            <X className="w-3 h-3 mr-1" /> Clear
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <div>
          <label className="text-xs text-muted-foreground block mb-1">From</label>
          <Input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">To</label>
          <Input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)} className="h-9" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">{entityType === 'client' ? 'Client' : 'Therapist'}</label>
          <Select value={filters.entityFilter} onValueChange={v => set('entityFilter', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{entityType === 'client' ? 'All Clients' : 'All Therapists'}</SelectItem>
              {entityOptions.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Sort</label>
          <Select value={filters.sortBy} onValueChange={(v: any) => set('sortBy', v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Date (Newest)</SelectItem>
              <SelectItem value="date-asc">Date (Oldest)</SelectItem>
              <SelectItem value="name-asc">{entityType === 'client' ? 'Client Name' : 'Therapist Name'} (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}

export const applySessionFilters = (sessions: any[], filters: SessionFilters, entityType: 'client' | 'therapist') => {
  let list = [...sessions];
  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    list = list.filter(s => new Date(s.date) >= from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    to.setHours(23, 59, 59, 999);
    list = list.filter(s => new Date(s.date) <= to);
  }
  if (filters.entityFilter !== 'all') {
    list = list.filter(s => {
      const id = entityType === 'client' ? (s.clientId?._id || s.clientId) : (s.therapistId?._id || s.therapistId);
      return String(id) === filters.entityFilter;
    });
  }
  if (filters.sortBy === 'date-desc') list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  else if (filters.sortBy === 'date-asc') list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  else if (filters.sortBy === 'name-asc') {
    list.sort((a, b) => {
      const na = entityType === 'client' ? (a.clientId?.name || '') : (a.therapistId?.name || '');
      const nb = entityType === 'client' ? (b.clientId?.name || '') : (b.therapistId?.name || '');
      return na.localeCompare(nb);
    });
  }
  return list;
};

export const buildEntityOptions = (sessions: any[], entityType: 'client' | 'therapist') => {
  const map = new Map<string, string>();
  sessions.forEach(s => {
    const obj = entityType === 'client' ? s.clientId : s.therapistId;
    const id = obj?._id || obj;
    const name = obj?.name;
    if (id && name) map.set(String(id), name);
  });
  return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
};
