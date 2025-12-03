
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar, Download, ChevronDown, CheckCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function generateICS(event) {
  const { title, date, description, location } = event;

  const eventDate = new Date(date);
  const startDate = formatICSDate(eventDate);

  const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
  const endDateFormatted = formatICSDate(endDate);

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ContractFlowAI//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${startDate}`,
    `DTEND:${endDateFormatted}`,
    `SUMMARY:${escapeICS(title)}`,
    `DESCRIPTION:${escapeICS(description || '')}`,
    `LOCATION:${escapeICS(location || '')}`,
    `STATUS:CONFIRMED`,
    `SEQUENCE:0`,
    `UID:${Date.now()}-${Math.random()}@contractflowai.com`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

function generateBulkICS(events) {
  const eventsContent = events.map((event, idx) => {
    const { title, date, description, location } = event;
    const eventDate = new Date(date);
    const startDate = formatICSDate(eventDate);
    const endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
    const endDateFormatted = formatICSDate(endDate);

    return [
      'BEGIN:VEVENT',
      `DTSTART:${startDate}`,
      `DTEND:${endDateFormatted}`,
      `SUMMARY:${escapeICS(title)}`,
      `DESCRIPTION:${escapeICS(description || '')}`,
      `LOCATION:${escapeICS(location || '')}`,
      `STATUS:CONFIRMED`,
      `SEQUENCE:0`,
      `UID:${Date.now()}-${idx}@contractflowai.com`,
      'END:VEVENT'
    ].join('\r\n');
  }).join('\r\n');

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ContractFlowAI//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    eventsContent,
    'END:VCALENDAR'
  ].join('\r\n');

  return icsContent;
}

function formatICSDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}

function escapeICS(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function createGoogleCalendarURL(event) {
  const { title, date, description, location } = event;
  const startDate = new Date(date);
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  const formatGoogleDate = (d) => {
    return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`,
    details: description || '',
    location: location || ''
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function downloadICS(icsContent, filename) {
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export default function AddToCalendarButton({ event, events, size = "sm", variant = "outline", className = "" }) {
  const [open, setOpen] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const isBulk = events && events.length > 0;

  const handleGoogleCalendar = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBulk) {
      const icsContent = generateBulkICS(events);
      downloadICS(icsContent, 'ContractFlowAI_All_Dates.ics');
      setSelectedProvider('google');
      setShowInstructions(true);
    } else {
      const url = createGoogleCalendarURL(event);
      window.open(url, '_blank');
    }
    setOpen(false);
  };

  const handleAppleCalendar = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBulk) {
      const icsContent = generateBulkICS(events);
      downloadICS(icsContent, 'ContractFlowAI_All_Dates.ics');
    } else {
      const icsContent = generateICS(event);
      downloadICS(icsContent, `${event.title.replace(/\s+/g, '_')}.ics`);
    }

    setSelectedProvider('apple');
    setShowInstructions(true);
    setOpen(false);
  };

  const handleOutlook = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBulk) {
      const icsContent = generateBulkICS(events);
      downloadICS(icsContent, 'ContractFlowAI_All_Dates.ics');
    } else {
      const icsContent = generateICS(event);
      downloadICS(icsContent, `${event.title.replace(/\s+/g, '_')}.ics`);
    }

    setSelectedProvider('outlook');
    setShowInstructions(true);
    setOpen(false);
  };

  const handleDownload = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isBulk) {
      const icsContent = generateBulkICS(events);
      downloadICS(icsContent, 'ContractFlowAI_All_Dates.ics');
    } else {
      const icsContent = generateICS(event);
      downloadICS(icsContent, `${event.title.replace(/\s+/g, '_')}.ics`);
    }

    setSelectedProvider('generic');
    setShowInstructions(true);
    setOpen(false);
  };

  const getInstructions = () => {
    if (selectedProvider === 'google' && isBulk) {
      return {
        title: "📅 Import to Google Calendar",
        steps: [
          "Open Google Calendar on your computer",
          "Click Settings (⚙️) in the top right",
          "Select 'Import & Export' from the left menu",
          "Click 'Select file from your computer'",
          "Choose 'ContractFlowAI_All_Dates.ics' from your Downloads",
          "Click 'Import' and your dates will appear!"
        ]
      };
    }

    if (selectedProvider === 'apple') {
      return {
        title: "🍎 Import to Apple Calendar",
        steps: isBulk ? [
          "Find 'ContractFlowAI_All_Dates.ics' in your Downloads",
          "On iPhone/iPad: Tap the file, then tap 'Add All'",
          "On Mac: Double-click the file",
          "Choose which calendar to add events to",
          "Click 'OK' to import all dates"
        ] : [
          "Find the downloaded .ics file in your Downloads",
          "On iPhone/iPad: Tap the file to open",
          "On Mac: Double-click the file",
          "The event will automatically be added to your calendar"
        ]
      };
    }

    if (selectedProvider === 'outlook') {
      return {
        title: "📧 Import to Outlook",
        steps: [
          "Open Outlook on your computer",
          "Go to File → Open & Export → Import/Export",
          "Select 'Import an iCalendar (.ics) file'",
          "Click 'Browse' and find the downloaded file",
          "Click 'OK' to import",
          "Your dates will appear in Outlook Calendar"
        ]
      };
    }

    return {
      title: "📥 File Downloaded",
      steps: [
        "The .ics calendar file has been downloaded",
        "Open it with your preferred calendar app",
        "Or import it manually through your calendar settings"
      ]
    };
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            size={size}
            variant={variant}
            className={`gap-2 ${className}`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            {isBulk ? <Download className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
            {isBulk ? 'SYNC Dates' : 'Add to Calendar'}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="text-xs text-gray-500">
            Choose your calendar app
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleGoogleCalendar} className="cursor-pointer py-3">
            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 flex items-center justify-center bg-blue-50 rounded-lg">
                <span className="text-xl">📅</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">Google Calendar</div>
                <div className="text-xs text-gray-500">
                  {isBulk ? 'Download & import' : 'Open directly'}
                </div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleAppleCalendar} className="cursor-pointer py-3">
            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg">
                <span className="text-xl">🍎</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">Apple Calendar</div>
                <div className="text-xs text-gray-500">iPhone, iPad, Mac</div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuItem onClick={handleOutlook} className="cursor-pointer py-3">
            <div className="flex items-center gap-3 w-full">
              <div className="w-8 h-8 flex items-center justify-center bg-blue-100 rounded-lg">
                <span className="text-xl">📧</span>
              </div>
              <div className="flex-1">
                <div className="font-semibold text-sm">Outlook</div>
                <div className="text-xs text-gray-500">Microsoft 365</div>
              </div>
            </div>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={handleDownload} className="cursor-pointer py-3">
            <div className="flex items-center gap-3 w-full">
              <Download className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <div className="font-semibold text-sm">Download .ics file</div>
                <div className="text-xs text-gray-500">For any calendar app</div>
              </div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Instructions Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              {getInstructions().title}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to complete the import
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {getInstructions().steps.map((step, index) => (
              <div key={index} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <p className="text-sm text-gray-700 pt-0.5">{step}</p>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowInstructions(false)}>
              Got it!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
