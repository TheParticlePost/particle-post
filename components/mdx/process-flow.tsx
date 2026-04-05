interface ProcessFlowProps {
  steps: string; // JSON string: ["Step 1 text", "Step 2 text", ...]
}

export function ProcessFlow({ steps }: ProcessFlowProps) {
  let parsed: string[] = [];
  try {
    parsed = JSON.parse(steps);
  } catch {
    return null;
  }

  return (
    <div className="my-6 py-6 overflow-x-auto">
      <div className="flex items-start gap-0 min-w-max px-4">
        {parsed.map((step, i) => (
          <div key={i} className="flex items-start">
            {/* Step */}
            <div className="flex flex-col items-center gap-3 min-w-[120px] max-w-[160px]">
              {/* Numbered circle */}
              <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                <span className="font-mono text-body-sm font-semibold text-white">
                  {i + 1}
                </span>
              </div>
              {/* Label */}
              <p className="text-body-sm text-text-secondary text-center leading-snug px-1">
                {step}
              </p>
            </div>

            {/* Connector line (not after last step) */}
            {i < parsed.length - 1 && (
              <div className="flex items-center pt-5 px-1">
                <div className="w-8 h-px bg-border-ghost" />
                <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-border-ghost" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
