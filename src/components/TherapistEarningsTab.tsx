import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, DollarSign, Building2, User, CalendarDays } from "lucide-react";
import { api } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { PriceNegotiationsPanel } from "@/components/PriceNegotiationsPanel";

interface MonthlyRow {
  month: string;
  totalRevenue: number;
  therapistShare: number;
  ehsaasShare: number;
}

interface Stats {
  totalEarnings: number;
  lifetimeTherapistShare: number;
  lifetimeEhsaasShare: number;
  commissionPercent: number;
  monthlyBreakdown: MonthlyRow[];
}

const monthLabel = (key: string) => {
  // key like "2026-04"
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export function TherapistEarningsTab() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getTherapistStats();
        setStats(data);
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally { setLoading(false); }
    })();
  }, []);

  const filtered: MonthlyRow[] = useMemo(() => {
    if (!stats?.monthlyBreakdown) return [];
    if (selectedMonth === 'all') return stats.monthlyBreakdown;
    return stats.monthlyBreakdown.filter(b => b.month === selectedMonth);
  }, [stats, selectedMonth]);

  const filteredTotals = useMemo(() => {
    return filtered.reduce((acc, r) => ({
      totalRevenue: acc.totalRevenue + r.totalRevenue,
      therapistShare: acc.therapistShare + r.therapistShare,
      ehsaasShare: acc.ehsaasShare + r.ehsaasShare,
    }), { totalRevenue: 0, therapistShare: 0, ehsaasShare: 0 });
  }, [filtered]);

  if (loading) {
    return <Card className="p-12 text-center"><p className="text-muted-foreground">Loading earnings...</p></Card>;
  }
  if (!stats) {
    return <Card className="p-12 text-center"><p className="text-muted-foreground">No earnings data yet.</p></Card>;
  }

  const months = stats.monthlyBreakdown || [];

  return (
    <div className="space-y-5">
      {/* Filter row */}
      <Card className="p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Earnings Filter</h3>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <Badge variant="secondary" className="text-sm">Commission: {stats.commissionPercent}% to you</Badge>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map(m => (
                  <SelectItem key={m.month} value={m.month}>{monthLabel(m.month)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Summary cards (filtered by selection) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-5 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue {selectedMonth !== 'all' && `(${monthLabel(selectedMonth)})`}</p>
              <p className="text-2xl font-bold text-foreground">₹{filteredTotals.totalRevenue.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">Before commission split</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center"><User className="w-5 h-5 text-green-600 dark:text-green-400" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Your Earnings</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">₹{filteredTotals.therapistShare.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">{stats.commissionPercent}% of revenue</p>
            </div>
          </div>
        </Card>
        <Card className="p-5 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/20 dark:to-orange-900/10 border-orange-200 dark:border-orange-800">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"><Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Ehsaas Share</p>
              <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">₹{filteredTotals.ehsaasShare.toLocaleString('en-IN')}</p>
              <p className="text-xs text-muted-foreground mt-1">{100 - stats.commissionPercent}% of revenue</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lifetime totals (always shown) */}
      {selectedMonth === 'all' && (
        <Card className="p-5">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4 text-primary" /> Lifetime Summary</h3>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-muted-foreground">Total Revenue (lifetime)</p>
              <p className="text-lg font-semibold">₹{stats.totalEarnings.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Your Lifetime Earnings</p>
              <p className="text-lg font-semibold text-green-600">₹{stats.lifetimeTherapistShare.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Ehsaas Lifetime Share</p>
              <p className="text-lg font-semibold text-orange-600">₹{stats.lifetimeEhsaasShare.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Per-month breakdown table */}
      <Card className="p-5">
        <h3 className="font-semibold text-foreground mb-3">Month-by-Month Breakdown</h3>
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No earnings recorded yet for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Month</th>
                  <th className="text-right py-2">Total Revenue</th>
                  <th className="text-right py-2 text-green-600">Your Earnings</th>
                  <th className="text-right py-2 text-orange-600">Ehsaas Share</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.month} className="border-b last:border-b-0">
                    <td className="py-2 font-medium">{monthLabel(row.month)}</td>
                    <td className="text-right py-2">₹{row.totalRevenue.toLocaleString('en-IN')}</td>
                    <td className="text-right py-2 text-green-600 font-medium">₹{row.therapistShare.toLocaleString('en-IN')}</td>
                    <td className="text-right py-2 text-orange-600 font-medium">₹{row.ehsaasShare.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3 italic">
          Note: Earnings figures are synced with the admin dashboard. Your commission rate is set by Ehsaas administration.
        </p>
      </Card>

      {/* Price Negotiations */}
      <Card className="p-5">
        <PriceNegotiationsPanel role="therapist" />
      </Card>
    </div>
  );
}
