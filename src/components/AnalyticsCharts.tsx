import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Star } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { api } from "@/services/api";

const COLORS = ['#16a34a', '#dc2626', '#2563eb', '#eab308'];

export const AnalyticsCharts = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) return <p className="text-muted-foreground text-center py-8">Could not load analytics</p>;

  const sessionPieData = [
    { name: 'Completed', value: data.sessionStats.completed, color: '#16a34a' },
    { name: 'Scheduled', value: data.sessionStats.scheduled, color: '#2563eb' },
    { name: 'Cancelled', value: data.sessionStats.cancelled, color: '#dc2626' },
    { name: 'No-Show', value: data.sessionStats.noShow || 0, color: '#f59e0b' },
  ].filter(d => d.value > 0);

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const formatMonth = (m: string) => {
    const parts = m.split('-');
    return `${monthNames[parseInt(parts[1])]} ${parts[0].slice(2)}`;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Completion Rate</p>
          <p className="text-3xl font-bold text-success">{data.sessionStats.completionRate}%</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Reviews</p>
          <p className="text-3xl font-bold text-foreground">{data.reviewStats.total}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Avg Rating</p>
          <div className="flex items-center gap-1">
            <p className="text-3xl font-bold text-foreground">{data.reviewStats.avgRating}</p>
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Sessions</p>
          <p className="text-3xl font-bold text-foreground">{data.sessionStats.total}</p>
        </Card>
      </div>

      {/* Monthly Revenue Chart */}
      {data.revenueData.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Monthly Revenue
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data.revenueData.map((d: any) => ({ ...d, label: formatMonth(d.month) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Session Breakdown Pie */}
        {sessionPieData.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Session Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={sessionPieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {sessionPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Client Growth Chart */}
        {data.growthData.length > 0 && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">Client Growth</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.growthData.map((d: any) => ({ ...d, label: formatMonth(d.month) }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="clients" stroke="#2563eb" strokeWidth={2} dot={{ fill: '#2563eb' }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}
      </div>

      {/* Top Therapists */}
      {data.topTherapists.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Top Therapists</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">#</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Name</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium">Rating</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Sessions</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Hours</th>
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium">Earnings</th>
                </tr>
              </thead>
              <tbody>
                {data.topTherapists.map((t: any, i: number) => (
                  <tr key={t._id} className="border-b last:border-0">
                    <td className="py-2 px-3 text-foreground">{i + 1}</td>
                    <td className="py-2 px-3">
                      <p className="font-medium text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.title}</p>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span>{t.rating}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right text-foreground">{t.sessions}</td>
                    <td className="py-2 px-3 text-right text-foreground">{t.hours}h</td>
                    <td className="py-2 px-3 text-right font-medium text-primary">₹{t.earnings.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
