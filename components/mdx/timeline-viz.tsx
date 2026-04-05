interface TimelineEvent {
  date: string;
  event: string;
}

interface TimelineVizProps {
  events: string; // JSON string: [{"date":"Q1 2025","event":"Pilot launch"}, ...]
}

export function TimelineViz({ events }: TimelineVizProps) {
  let parsed: TimelineEvent[] = [];
  try {
    parsed = JSON.parse(events);
  } catch {
    return null;
  }

  return (
    <div className="my-6 py-4 overflow-x-auto">
      <div className="relative min-w-max px-8">
        {/* Horizontal line */}
        <div className="absolute top-[20px] left-8 right-8 h-px bg-border-ghost" />

        <div className="flex items-start gap-0">
          {parsed.map((item, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center min-w-[140px] max-w-[180px]"
            >
              {/* Date label (above line for even, below for odd to alternate) */}
              {i % 2 === 0 ? (
                <>
                  <p className="font-mono text-body-xs text-accent font-medium mb-2 text-center px-1">
                    {item.date}
                  </p>
                  {/* Dot */}
                  <div className="w-3 h-3 rounded-full bg-accent border-2 border-bg-base shrink-0 z-10" />
                  {/* Event label */}
                  <p className="text-body-sm text-text-secondary text-center mt-2 leading-snug px-2">
                    {item.event}
                  </p>
                </>
              ) : (
                <>
                  {/* Spacer to push event above */}
                  <p className="text-body-sm text-text-secondary text-center mb-2 leading-snug px-2 order-1">
                    {item.event}
                  </p>
                  {/* Dot */}
                  <div className="w-3 h-3 rounded-full bg-accent border-2 border-bg-base shrink-0 z-10 order-2" />
                  {/* Date label below */}
                  <p className="font-mono text-body-xs text-accent font-medium mt-2 text-center px-1 order-3">
                    {item.date}
                  </p>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
