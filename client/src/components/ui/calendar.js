import * as React from 'react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { buttonVariants } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { DayPicker } from 'react-day-picker';

function Calendar({ className, classNames, showOutsideDays = true, ...props }) {
  // Controlled month to render our own header
  const initialMonth = props.month ?? new Date();
  const [month, setMonth] = useState(initialMonth);
  return (
    <div className={cn('calendar-widget', className)}>
      {/* Custom header: < Month Year > */}
      <div className="dtp-cal-caption-row">
        <button
          type="button"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'dtp-cal-prev')}
          onClick={() => setMonth((m) => addMonths(m, -1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="dtp-cal-caption-label">{format(month, 'LLLL yyyy')}</div>
        <button
          type="button"
          className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'dtp-cal-next')}
          onClick={() => setMonth((m) => addMonths(m, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <DayPicker
        month={month}
        onMonthChange={setMonth}
        showOutsideDays={showOutsideDays}
        className={cn('p-3')}
  components={{ Caption: () => null, Nav: () => null }}
        classNames={{
          months: 'dtp-cal-months',
          month: 'dtp-cal-month',
          caption: 'hidden', /* hide DayPicker caption */
          nav: 'hidden',      /* hide DayPicker nav */
          head_cell: 'h-8 w-8 p-0 text-xs font-medium text-muted-foreground/80',
          table: 'rdp-table',
          day_button:
            'cursor-pointer relative flex h-8 w-8 items-center justify-center whitespace-nowrap rounded-md p-0 text-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
          day: 'group h-8 w-8 px-0 py-px text-sm',
          day_today: 'bg-primary text-primary-foreground font-semibold',
          day_selected: 'bg-primary text-primary-foreground',
          day_outside: 'text-muted-foreground opacity-50',
          day_disabled: 'text-muted-foreground opacity-30 cursor-not-allowed',
          day_hidden: 'invisible',
          ...classNames,
        }}
        {...props}
      />
    </div>
  );
}

export { Calendar };
