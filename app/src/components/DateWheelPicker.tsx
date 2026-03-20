import React, { useState, useRef, useEffect, useCallback } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;

interface DateWheelPickerProps {
  value: string; // ISO YYYY-MM-DD
  onChange: (date: string) => void;
  maxDate?: string;
  minYear?: number;
}

function daysInMonth(month: number, year: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// ─── Single scroll wheel column ──────────────────────────────────────────────

interface WheelColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  width?: string;
}

function WheelColumn({ items, selectedIndex, onSelect, width = 'flex-1' }: WheelColumnProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Scroll to the selected index on mount and when it changes externally
  useEffect(() => {
    if (containerRef.current && !isScrolling.current) {
      containerRef.current.scrollTop = selectedIndex * ITEM_HEIGHT;
    }
  }, [selectedIndex]);

  const handleScroll = useCallback(() => {
    isScrolling.current = true;
    if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

    scrollTimeout.current = setTimeout(() => {
      if (!containerRef.current) return;
      const scrollTop = containerRef.current.scrollTop;
      const index = Math.round(scrollTop / ITEM_HEIGHT);
      const clamped = clamp(index, 0, items.length - 1);

      // Snap to nearest item
      containerRef.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: 'smooth' });

      isScrolling.current = false;
      if (clamped !== selectedIndex) {
        onSelect(clamped);
      }
    }, 80);
  }, [items.length, selectedIndex, onSelect]);

  // Padding items so the first/last items can be centered
  const padCount = Math.floor(VISIBLE_ITEMS / 2);

  return (
    <div className={`relative ${width}`} style={{ height: WHEEL_HEIGHT }}>
      {/* Center highlight bar */}
      <div
        className="absolute left-1 right-1 rounded-lg bg-primary-container/40 pointer-events-none z-10"
        style={{ top: padCount * ITEM_HEIGHT, height: ITEM_HEIGHT }}
      />
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-hide"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* Top padding */}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-top-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
        {items.map((item, i) => (
          <div
            key={i}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'start' }}
            className={`flex items-center justify-center text-sm font-medium cursor-pointer transition-colors select-none ${
              i === selectedIndex
                ? 'text-on-surface'
                : 'text-on-surface-variant/50'
            }`}
            onClick={() => {
              onSelect(i);
              containerRef.current?.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' });
            }}
          >
            {item}
          </div>
        ))}
        {/* Bottom padding */}
        {Array.from({ length: padCount }).map((_, i) => (
          <div key={`pad-bot-${i}`} style={{ height: ITEM_HEIGHT }} />
        ))}
      </div>
      {/* Fade masks */}
      <div className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-surface-container to-transparent pointer-events-none z-20" />
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface-container to-transparent pointer-events-none z-20" />
    </div>
  );
}

// ─── Main DateWheelPicker ────────────────────────────────────────────────────

export function DateWheelPicker({ value, onChange, maxDate, minYear = 1980 }: DateWheelPickerProps) {
  const today = new Date();
  const maxD = maxDate ? new Date(maxDate) : today;
  const maxYear = maxD.getFullYear();

  // Parse current value
  const parsed = value ? new Date(value + 'T00:00:00') : today;
  const [month, setMonth] = useState(parsed.getMonth());
  const [day, setDay] = useState(parsed.getDate());
  const [year, setYear] = useState(parsed.getFullYear());

  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => minYear + i);
  const dayCount = daysInMonth(month, year);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  // Clamp day when month/year changes
  const clampedDay = Math.min(day, dayCount);

  // Emit change
  useEffect(() => {
    const d = clampedDay;
    const m = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    const iso = `${year}-${m}-${dd}`;

    // Clamp to maxDate
    if (maxDate && iso > maxDate) return;

    if (iso !== value) {
      onChange(iso);
    }
  }, [month, clampedDay, year, maxDate, value, onChange]);

  // Sync from external value changes
  useEffect(() => {
    if (!value) return;
    const p = new Date(value + 'T00:00:00');
    if (!isNaN(p.getTime())) {
      setMonth(p.getMonth());
      setDay(p.getDate());
      setYear(p.getFullYear());
    }
  }, [value]);

  return (
    <div className="flex gap-1 bg-surface-container rounded-xl border border-outline-variant p-2">
      <WheelColumn
        items={MONTHS}
        selectedIndex={month}
        onSelect={setMonth}
        width="w-[110px]"
      />
      <WheelColumn
        items={days.map(String)}
        selectedIndex={clampedDay - 1}
        onSelect={(i) => setDay(i + 1)}
        width="w-[50px]"
      />
      <WheelColumn
        items={years.map(String)}
        selectedIndex={year - minYear}
        onSelect={(i) => setYear(minYear + i)}
        width="w-[70px]"
      />
    </div>
  );
}
