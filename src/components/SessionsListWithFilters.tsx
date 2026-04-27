import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Filter, X, Calendar as CalendarIcon, SlidersHorizontal } from "lucide-react";

interface SessionsListWithFiltersProps {
  sessions: any[];
  role: 'admin' | 'therapist' | 'client';
  /** Optional render override for each session row (e.g. add action buttons) */
  renderSession?: (s: any) => React.ReactNode;
}

const sessionStatusBadge = (status: string) => {
  const variants: any = {
    scheduled: { label: 'Scheduled', className: 'bg-blue-500/10 text-blue-600' },
    completed: { label: 'Completed', className: 'bg-green-500/10 text-green-600' },
    cancelled: { label: 'Cancelled', className: 'bg-red-500/10 text-red-600' },
    'no-show': { label: 'No-Show', className: 'bg-orange-500/10 text-orange-600' },
  };
  const v = variants[status] || { label: status, className: '' };
  return <Badge variant="secondary" className={v.className}>{v.label}</Badge>;
};

export function SessionsListWithFilters({ sessions, role, renderSession }: SessionsListWithFiltersProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [therapistFilter, setTherapistFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'therapist' | 'client'>('date-desc');

  // Build distinct therapists/clients for dropdowns
  const therapistOptions = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach(s => {
      const id = s.therapistId?._id || s.therapistId;
      const name = s.therapistId?.name;
      if (id && name) map.set(String(id), name);
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  const clientOptions = useMemo(() => {
    const map = new Map<string, string>();
    sessions.forEach(s => {
      const id = s.clientId?._id || s.clientId;
      const name = s.clientId?.name;
      if (id && name) map.set(String(id), name);
    });
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [sessions]);

  const filtered = useMemo(() => {
    let list = [...sessions];
    if (dateFrom) {
      const from = new Date(dateFrom);
      list = list.filter(s => new Date(s.date) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(s => new Date(s.date) <= to);
    }
    if (therapistFilter !== 'all') {
      list = list.filter(s => String(s.therapistId?._id || s.therapistId) === therapistFilter);
    }
    if (clientFilter !== 'all') {
      list = list.filter(s => String(s.clientId?._id || s.clientId) === clientFilter);
    }
    if (sortBy === 'date-desc') list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    else if (sortBy === 'date-asc') list.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else if (sortBy === 'therapist') list.sort((a, b) => (a.therapistId?.name || '').localeCompare(b.therapistId?.name || ''));
    else if (sortBy === 'client') list.sort((a, b) => (a.clientId?.name || '').localeCompare(b.clientId?.name || ''));
    return list;
  }, [sessions, dateFrom, dateTo, therapistFilter, clientFilter, sortBy]);

  const clearFilters = () => {
    setDateFrom(""); setDateTo(""); setTherapistFilter('all'); setClientFilter('all'); setSortBy('date-desc');
  };

  const hasFilters = dateFrom || dateTo || therapistFilter !== 'all' || clientFilter !== 'all';
  const activeCount = [dateFrom !== '', dateTo !== '', therapistFilter !== 'all', clientFilter !== 'all', sortBy !== 'date-desc'].filter(Boolean).length;
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">
          {role === 'admin' ? 'All Sessions' : role === 'therapist' ? 'Sessions' : 'My Sessions'} ({filtered.length})
        </h2>
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="relative">
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Filter & Sort
              {activeCount > 0 && (
                <Badge className="ml-2 bg-primary text-primary-foreground text-xs px-1.5 h-5 min-w-5">
                  {activeCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-3" align="end">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Filters & Sort</h3>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-7">
                  <X className="w-3 h-3 mr-1" /> Clear
                </Button>
              )}
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">From Date</label>
                  <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9" />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">To Date</label>
                  <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9" />
                </div>
              </div>

              {(role === 'admin' || role === 'client') && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Therapist</label>
                  <Select value={therapistFilter} onValueChange={setTherapistFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Therapists</SelectItem>
                      {therapistOptions.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {(role === 'admin' || role === 'therapist') && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Client</label>
                  <Select value={clientFilter} onValueChange={setClientFilter}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      {clientOptions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Sort By</label>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (Newest)</SelectItem>
                    <SelectItem value="date-asc">Date (Oldest)</SelectItem>
                    {(role === 'admin' || role === 'client') && <SelectItem value="therapist">Therapist Name</SelectItem>}
                    {(role === 'admin' || role === 'therapist') && <SelectItem value="client">Client Name</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <CalendarIcon className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No sessions match your filters.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => renderSession ? renderSession(s) : (
            <Card key={s._id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium text-foreground">
                    {role === 'client' ? s.therapistId?.name || 'Unknown Therapist'
                     : role === 'therapist' ? s.clientId?.name || 'Unknown Client'
                     : `${s.clientId?.name || 'Unknown Client'} → ${s.therapistId?.name || 'Unknown Therapist'}`}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(s.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    {' '}at {s.startTime} • {s.duration} min
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {s.amount != null && <Badge variant="secondary">₹{s.amount}</Badge>}
                  {sessionStatusBadge(s.status)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
