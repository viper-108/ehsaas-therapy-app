import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/services/api";

interface AvailabilityCalendarProps {
  availability: any[];
  therapistId?: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

export const AvailabilityCalendar = ({ availability, therapistId }: AvailabilityCalendarProps) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({});

  const getWeekDates = () => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (weekOffset * 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates();

  useEffect(() => {
    if (!therapistId) return;
    // Fetch booked slots for each day of the week
    const fetchSlots = async () => {
      const slots: Record<string, string[]> = {};
      for (const date of weekDates) {
        const dateStr = date.toISOString().split('T')[0];
        try {
          const data = await api.getAvailableSlots(therapistId, dateStr);
          // booked = all possible slots minus available
          const dayAvail = availability.find(a => a.dayOfWeek === date.getDay() && a.isAvailable);
          if (dayAvail) {
            const startH = parseInt(dayAvail.startTime.split(':')[0]);
            const endH = parseInt(dayAvail.endTime.split(':')[0]);
            const allSlots = [];
            for (let h = startH; h < endH; h++) allSlots.push(`${String(h).padStart(2, '0')}:00`);
            const availableTimes = (data.slots || []).map((s: any) => s.time);
            slots[dateStr] = allSlots.filter(t => !availableTimes.includes(t));
          }
        } catch {}
      }
      setBookedSlots(slots);
    };
    fetchSlots();
  }, [weekOffset, therapistId]);

  const isAvailableDay = (dayOfWeek: number) => {
    return availability.some(a => a.dayOfWeek === dayOfWeek && a.isAvailable);
  };

  const getSlotStatus = (date: Date, hour: number): 'available' | 'booked' | 'unavailable' => {
    const dayOfWeek = date.getDay();
    const dayAvail = availability.find(a => a.dayOfWeek === dayOfWeek && a.isAvailable);
    if (!dayAvail) return 'unavailable';

    const startH = parseInt(dayAvail.startTime.split(':')[0]);
    const endH = parseInt(dayAvail.endTime.split(':')[0]);
    if (hour < startH || hour >= endH) return 'unavailable';

    const dateStr = date.toISOString().split('T')[0];
    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    if (bookedSlots[dateStr]?.includes(timeStr)) return 'booked';

    return 'available';
  };

  const statusColors = {
    available: 'bg-success/20 border-success/30 text-success',
    booked: 'bg-warm/20 border-warm/30 text-warm',
    unavailable: 'bg-muted/30 border-transparent text-muted-foreground/30',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w - 1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <h3 className="font-medium text-foreground text-sm">
          {weekDates[0].toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(w => w + 1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-3 text-xs">
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-success/20 border border-success/30" /> Available</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-warm/20 border border-warm/30" /> Booked</div>
        <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-muted/30" /> Unavailable</div>
      </div>

      {/* Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-8 gap-1 min-w-[600px]">
          {/* Header row */}
          <div className="text-xs font-medium text-muted-foreground p-1" />
          {weekDates.map((date, i) => (
            <div key={i} className="text-center text-xs p-1">
              <div className="font-medium text-foreground">{DAYS[date.getDay()]}</div>
              <div className="text-muted-foreground">{date.getDate()}</div>
            </div>
          ))}

          {/* Time rows */}
          {HOURS.map(hour => (
            <>
              <div key={`label-${hour}`} className="text-xs text-muted-foreground p-1 text-right">
                {hour > 12 ? `${hour - 12}PM` : hour === 12 ? '12PM' : `${hour}AM`}
              </div>
              {weekDates.map((date, i) => {
                const status = getSlotStatus(date, hour);
                return (
                  <div
                    key={`${hour}-${i}`}
                    className={`h-6 rounded border text-xs flex items-center justify-center ${statusColors[status]}`}
                  >
                    {status === 'booked' ? '●' : status === 'available' ? '' : ''}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </Card>
  );
};
