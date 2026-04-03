"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface PostEntry {
  slug: string;
  title: string;
  funnel_type: string;
  date: string;
}

const FUNNEL_COLORS: Record<string, string> = {
  TOF: "bg-accent",
  MOF: "bg-blue-400",
  BOF: "bg-purple-400",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const date = new Date(year, month, 1);
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

function getStartPadding(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday=0 format
  return day === 0 ? 6 : day - 1;
}

export function ContentCalendar() {
  const [posts, setPosts] = useState<PostEntry[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/config/pipeline/config/post_index.json"
      );
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const days = getDaysInMonth(year, month);
  const startPad = getStartPadding(year, month);

  // Build date → posts map
  const postsByDate = new Map<string, PostEntry[]>();
  for (const post of posts) {
    const key = post.date;
    if (!postsByDate.has(key)) postsByDate.set(key, []);
    postsByDate.get(key)!.push(post);
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };

  const selectedPosts = selectedDay ? postsByDate.get(selectedDay) || [] : [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="px-2 py-1 text-text-muted hover:text-accent transition-colors"
        >
          &larr;
        </button>
        <h3 className="font-display text-body-md text-text-primary">
          {MONTHS[month]} {year}
        </h3>
        <button
          onClick={nextMonth}
          className="px-2 py-1 text-text-muted hover:text-accent transition-colors"
        >
          &rarr;
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center font-mono text-caption text-text-muted py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Padding for start of month */}
        {Array.from({ length: startPad }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}

        {days.map((date) => {
          const dateStr = date.toISOString().slice(0, 10);
          const dayPosts = postsByDate.get(dateStr) || [];
          const isToday =
            dateStr === new Date().toISOString().slice(0, 10);
          const isSelected = selectedDay === dateStr;

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDay(isSelected ? null : dateStr)}
              className={cn(
                "relative rounded-lg p-1.5 text-center min-h-[40px] transition-colors duration-[180ms]",
                isToday && "ring-1 ring-accent/40",
                isSelected
                  ? "bg-accent/10 border border-accent/30"
                  : "hover:bg-bg-low",
                dayPosts.length > 0 && "cursor-pointer"
              )}
            >
              <span
                className={cn(
                  "text-body-xs",
                  isToday ? "text-accent font-medium" : "text-text-muted"
                )}
              >
                {date.getDate()}
              </span>
              {dayPosts.length > 0 && (
                <div className="flex justify-center gap-0.5 mt-0.5">
                  {dayPosts.map((p, i) => (
                    <span
                      key={i}
                      className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        FUNNEL_COLORS[p.funnel_type] || "bg-text-muted"
                      )}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-ghost">
        {Object.entries(FUNNEL_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", color)} />
            <span className="font-mono text-caption text-text-muted">
              {type}
            </span>
          </div>
        ))}
      </div>

      {/* Selected day detail */}
      {selectedDay && selectedPosts.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border-ghost space-y-2">
          <p className="font-mono text-caption text-text-muted">
            {selectedDay}
          </p>
          {selectedPosts.map((p) => (
            <div
              key={p.slug}
              className="flex items-center gap-2 p-2 bg-bg-low rounded-lg"
            >
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  FUNNEL_COLORS[p.funnel_type] || "bg-text-muted"
                )}
              />
              <span className="text-body-xs text-text-body truncate">
                {p.title}
              </span>
              <span className="font-mono text-caption text-text-muted shrink-0">
                {p.funnel_type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
