export default function ProgressBar({ current, total, label }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div>
      {label && (
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[10px] text-lab-muted uppercase tracking-wider">{label}</span>
          <span className="font-mono text-[10px] text-lab-muted">{pct}%</span>
        </div>
      )}
      <div className="h-1.5 bg-lab-border/30 rounded-full overflow-hidden">
        <div
          className="h-full bg-lab-green rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
