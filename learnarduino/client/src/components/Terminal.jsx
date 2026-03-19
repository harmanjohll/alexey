import { useEffect, useRef } from 'react';

export default function Terminal({ lines, onClear }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-lab-border bg-lab-surface">
        <span className="font-mono text-[10px] text-lab-muted uppercase tracking-wider">Serial Monitor</span>
        <button
          onClick={onClear}
          className="font-mono text-[10px] text-lab-muted hover:text-lab-red transition-colors"
        >
          Clear
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 bg-[#0a0e14] font-mono text-xs text-lab-green">
        {lines.length === 0 ? (
          <span className="text-lab-muted italic">No serial output yet...</span>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="leading-5">
              <span className="text-lab-muted mr-2 select-none">{String(i + 1).padStart(3, ' ')}</span>
              {line}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
