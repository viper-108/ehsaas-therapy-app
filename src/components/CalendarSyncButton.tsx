import { Calendar, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface CalendarSyncProps {
  title: string;
  date: string; // ISO date
  startTime: string; // "14:00"
  endTime: string;
  duration: number;
  description?: string;
  location?: string;
}

const formatDateForGoogle = (date: string, time: string) => {
  const d = new Date(`${date}T${time}:00`);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

const generateGoogleCalendarUrl = (props: CalendarSyncProps) => {
  const startDateTime = formatDateForGoogle(props.date, props.startTime);
  const endDateTime = formatDateForGoogle(props.date, props.endTime);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: props.title,
    dates: `${startDateTime}/${endDateTime}`,
    details: props.description || `${props.duration} minute therapy session via Ehsaas Therapy Centre`,
    location: props.location || 'Online (Ehsaas Therapy Centre)',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const generateICS = (props: CalendarSyncProps) => {
  const startDateTime = formatDateForGoogle(props.date, props.startTime);
  const endDateTime = formatDateForGoogle(props.date, props.endTime);
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ehsaas Therapy Centre//EN',
    'BEGIN:VEVENT',
    `DTSTART:${startDateTime}`,
    `DTEND:${endDateTime}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${props.title}`,
    `DESCRIPTION:${props.description || props.duration + ' minute therapy session'}`,
    `LOCATION:${props.location || 'Online (Ehsaas Therapy Centre)'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
};

export const CalendarSyncButton = (props: CalendarSyncProps) => {
  const handleGoogleCalendar = () => {
    window.open(generateGoogleCalendarUrl(props), '_blank');
  };

  const handleDownloadICS = () => {
    const ics = generateICS(props);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ehsaas-session-${props.date}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Calendar className="w-3 h-3" />
          <span className="hidden sm:inline">Add to Calendar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleGoogleCalendar}>
          <ExternalLink className="w-4 h-4 mr-2" />
          Google Calendar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadICS}>
          <Download className="w-4 h-4 mr-2" />
          Download .ics
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
