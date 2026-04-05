interface PersonaCalloutProps {
  role: "cfo" | "cto" | "coo" | "ceo";
  text: string;
}

const roleConfig = {
  cfo: {
    label: "CFO",
    tintBorder: "border-blue-500/20",
    tintBg: "bg-blue-500/5",
    pillBg: "bg-blue-500/15",
    pillText: "text-blue-400",
  },
  cto: {
    label: "CTO",
    tintBorder: "border-purple-500/20",
    tintBg: "bg-purple-500/5",
    pillBg: "bg-purple-500/15",
    pillText: "text-purple-400",
  },
  coo: {
    label: "COO",
    tintBorder: "border-teal-500/20",
    tintBg: "bg-teal-500/5",
    pillBg: "bg-teal-500/15",
    pillText: "text-teal-400",
  },
  ceo: {
    label: "CEO",
    tintBorder: "border-amber-500/20",
    tintBg: "bg-amber-500/5",
    pillBg: "bg-amber-500/15",
    pillText: "text-amber-400",
  },
};

export function PersonaCallout({ role, text }: PersonaCalloutProps) {
  const config = roleConfig[role] || roleConfig.ceo;

  return (
    <div
      className={`my-6 rounded border ${config.tintBorder} ${config.tintBg} bg-bg-high p-5`}
    >
      {/* Role pill */}
      <span
        className={`inline-block font-mono text-body-xs font-semibold tracking-wider px-2.5 py-1 rounded ${config.pillBg} ${config.pillText} mb-3`}
      >
        {config.label}
      </span>

      {/* Callout text */}
      <p className="text-body-md text-text-secondary leading-relaxed">
        {text}
      </p>
    </div>
  );
}
