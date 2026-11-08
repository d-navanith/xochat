import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';

interface DatePickerPillProps {
  value: string; // e.g. "10.28.2026"
  onChange: (date: string) => void;
  className?: string;
}

export const DatePickerPill: React.FC<DatePickerPillProps> = ({
  value,
  onChange,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse current value (supports both DD.MM.YYYY and MM.DD.YYYY)
  const parseDateString = (str: string) => {
    if (!str || str === 'all') return new Date(2026, 9, 28);
    const parts = str.split('.');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const y = parseInt(parts[2], 10);
      if (!isNaN(p0) && !isNaN(p1) && !isNaN(y)) {
        // If p0 > 12: definitely DD.MM.YYYY (e.g. 28.10.2026)
        if (p0 > 12) {
          return new Date(y, p1 - 1, p0);
        }
        // If p1 > 12: definitely MM.DD.YYYY (e.g. 10.28.2026)
        if (p1 > 12) {
          return new Date(y, p0 - 1, p1);
        }
        // For ambiguous e.g. 01.11.2026:
        // In user's convention, 01.11.2026 is November 1st (month index 10, day 1)
        if (p0 === 1 && p1 === 11) {
          return new Date(y, 10, 1);
        }
        if (p0 === 11 && p1 === 1) {
          return new Date(y, 10, 1);
        }
        return new Date(y, p1 - 1, p0);
      }
    }
    return new Date(2026, 9, 28); // Default fallback: Oct 28, 2026
  };

  const initialDate = parseDateString(value);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed

  // Keep view synchronized if value changes externally
  useEffect(() => {
    const d = parseDateString(value);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Format Date to DD.MM.YYYY matching user screenshot (e.g. 01.11.2026)
  const formatDateToDDMMYYYY = (d: Date) => {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const selected = new Date(viewYear, viewMonth, day);
    onChange(formatDateToDDMMYYYY(selected));
    setIsOpen(false);
  };

  // Build grid days for the month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sunday

  const activeDate = parseDateString(value);
  const isSelected = (day: number) => {
    return (
      activeDate.getFullYear() === viewYear &&
      activeDate.getMonth() === viewMonth &&
      activeDate.getDate() === day
    );
  };

  return (
    <div className={`relative inline-block ${className}`} ref={popoverRef}>
      {/* Exact Pill Button matching media_1793535661819_ede9d9a6.png */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Filter conversations by date"
        className="flex items-center gap-2 bg-white border border-[#cfd4dc] rounded-md px-3 py-1 shadow-2xs text-xs sm:text-sm font-medium text-[#344054] hover:border-gray-400 hover:bg-gray-50 transition-all cursor-pointer select-none"
      >
        <span>{value === 'all' ? 'All Dates' : (value || '10.28.2026')}</span>
        <CalendarIcon className="w-3.5 h-3.5 text-[#667085] shrink-0" />
      </button>

      {/* Floating Interactive Calendar Dropdown matching Xochat Theme */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 z-50 bg-white rounded-2xl border border-gray-200 shadow-xl p-4 w-72 animate-in fade-in zoom-in-95 duration-150">
          {/* Header Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="text-xs font-black text-gray-900 tracking-tight">
              {monthNames[viewMonth]} {viewYear}
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-400 mt-2 mb-1">
            <span>Su</span>
            <span>Mo</span>
            <span>Tu</span>
            <span>We</span>
            <span>Th</span>
            <span>Fr</span>
            <span>Sa</span>
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center text-xs">
            {/* Empty offset days */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <span key={`empty_${i}`} className="p-1.5" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const selected = isSelected(day);
              const isDefaultMockupDate = viewYear === 2026 && viewMonth === 9 && day === 28;

              return (
                <button
                  key={`day_${day}`}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`p-1.5 rounded-full text-xs font-bold transition-all cursor-pointer relative ${
                    selected
                      ? 'bg-[#fde047] text-gray-950 font-black shadow-xs ring-2 ring-amber-300'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span>{day}</span>
                  {/* Subtle marker for active mockup data on 28th */}
                  {isDefaultMockupDate && !selected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-emerald-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Shortcuts matching Xochat Theme */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                onChange('01.11.2026');
                setViewYear(2026);
                setViewMonth(10);
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-amber-700 hover:text-amber-900 px-2 py-0.5 rounded-md bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors cursor-pointer flex items-center gap-1"
            >
              <Clock className="w-3 h-3" />
              <span>01.11.2026</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onChange('10.28.2026');
                setViewYear(2026);
                setViewMonth(9);
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Clock className="w-3 h-3" />
              <span>10.28.2026</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const today = new Date();
                onChange(formatDateToDDMMYYYY(today));
                setViewYear(today.getFullYear());
                setViewMonth(today.getMonth());
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Today</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onChange('all');
                setIsOpen(false);
              }}
              className="text-[11px] font-bold text-gray-700 hover:text-gray-900 px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
            >
              <span>All Dates</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
