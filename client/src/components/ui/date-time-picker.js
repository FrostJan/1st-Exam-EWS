import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { ScrollArea } from './scroll-area';
import { format, addDays } from 'date-fns';

export default function DateTimePicker({ value, onChange, disabled = [] }) {
  const today = new Date();
  const [date, setDate] = useState(value?.date || today);
  const [time, setTime] = useState(value?.time || '10:00');

  // Time slots data
  const timeSlots = [
    { time: '09:00', available: false },
    { time: '09:30', available: false },
    { time: '10:00', available: true },
    { time: '10:30', available: true },
    { time: '11:00', available: true },
    { time: '11:30', available: true },
    { time: '12:00', available: false },
    { time: '12:30', available: true },
    { time: '13:00', available: true },
    { time: '13:30', available: true },
    { time: '14:00', available: true },
    { time: '14:30', available: false },
    { time: '15:00', available: false },
    { time: '15:30', available: true },
    { time: '16:00', available: true },
    { time: '16:30', available: true },
    { time: '17:00', available: true },
    { time: '17:30', available: true },
    { time: '18:00', available: true },
    { time: '18:30', available: true },
    { time: '19:00', available: true },
    { time: '19:30', available: true },
    { time: '20:00', available: true },
    { time: '20:30', available: true },
    { time: '21:00', available: true },
    { time: '21:30', available: true },
    { time: '22:00', available: true },
    { time: '22:30', available: true },
    { time: '23:00', available: true },
    { time: '23:30', available: true },
    { time: '24:00', available: true },
  ];

  // Sync internal state with prop
  useEffect(() => {
    if (value?.date) {
      setDate(value.date);
    }
    if (value?.time) {
      setTime(value.time);
    }
  }, [value]);

  // handlers are inline

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <Button 
            type="button" 
            variant="outline" 
            mode="input" 
            placeholder={!date} 
            className="w-full datetime-picker-trigger"
          >
            {date ? format(date, 'PPP') + (time ? ` - ${time}` : '') : <span>Pick a date and time</span>}
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 dtp-popover" align="start">
        <div className="dtp-layout">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(newDate) => {
              if (newDate) {
                setDate(newDate);
                setTime(undefined);
                if (onChange) {
                  onChange({ date: newDate, time: undefined });
                }
              }
            }}
            className="calendar-widget dtp-calendar"
            disabled={[{ before: addDays(today, 3) }]}
          />
          <div className="dtp-right">
            <div className="dtp-right-inner">
              <ScrollArea className="dtp-scroll">
                <div className="dtp-times">
                  <div className="dtp-times-header">
                    <p>{date ? format(date, 'EEEE, d') : 'Pick a date'}</p>
                  </div>
                  <div className="dtp-times-grid">
                    {timeSlots.map(({ time: timeSlot, available }) => (
                      <Button
                        key={timeSlot}
                        variant="outline"
                        size="sm"
                        className={`w-full dtp-time-btn ${time === timeSlot ? 'selected' : ''}`}
                        onClick={() => {
                          setTime(timeSlot);
                          if (date && onChange) {
                            onChange({ date, time: timeSlot });
                          }
                        }}
                        disabled={!available}
                      >
                        {timeSlot}
                      </Button>
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
