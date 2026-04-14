'use client';

import React, { useMemo } from 'react';
import dayjs from 'dayjs';
import clsx from 'clsx';

interface CalendarProps {
  date?: string | Date | null;
  className?: string;
}

export const Calendar: React.FC<CalendarProps> = ({ date, className }) => {
  const current = useMemo(() => (date ? dayjs(date) : dayjs()), [date]);
  const monthStart = current.startOf('month');
  const monthEnd = current.endOf('month');
  const startDate = monthStart.startOf('week');
  const endDate = monthEnd.endOf('week');

  const days = useMemo(() => {
    const arr = [];
    let curr = startDate;
    while (curr.isBefore(endDate) || curr.isSame(endDate, 'day')) {
      arr.push(curr);
      curr = curr.add(1, 'day');
    }
    return arr;
  }, [startDate, endDate]);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div
      className={clsx(
        'flex flex-col bg-background backdrop-blur-md border border-border rounded p-4 shadow-xl h-full select-none',
        className
      )}
    >
      <div className="flex justify-between items-baseline mb-4">
        <span className="text-2xl font-bold tracking-tight">
          {current.format('MMMM')}
        </span>
        <span className="text-sm opacity-60 font-medium">
          {current.format('YYYY')}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div
            key={day}
            className="text-[10px] uppercase font-bold text-center opacity-40 py-1"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 flex-1">
        {days.map(day => {
          const isCurrentMonth = day.isSame(current, 'month');
          const isSelected = day.isSame(current, 'day');
          const isToday = day.isSame(dayjs(), 'day');

          return (
            <div
              key={day.format('YYYY-MM-DD')}
              className={clsx(
                'relative flex items-center justify-center aspect-square text-sm rounded-lg transition-all duration-300',
                !isCurrentMonth && 'opacity-20',
                isSelected
                  ? 'bg-primary text-main font-bold scale-110 shadow-lg z-10'
                  : 'hover:bg-background/10'
              )}
            >
              {day.date()}
              {isToday && !isSelected && (
                <div className="absolute bottom-1 w-1 h-1 bg-white rounded-full opacity-60" />
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-white/10 flex flex-col items-center">
        <span className="text-4xl font-black tracking-tighter">
          {current.date()}
        </span>
        <span className="text-[10px] uppercase font-bold tracking-widest opacity-60 mt-1">
          {current.format('dddd')}
        </span>
      </div>
    </div>
  );
};
