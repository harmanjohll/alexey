export default function DiagramViewer({ svg }) {
  if (!svg) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="text-lab-muted font-mono text-xs mb-2">No circuit diagram available</div>
          <div className="text-lab-muted/50 text-[10px]">Diagrams will be added in Phase 2</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex items-center justify-center h-full">
      <div
        className="max-w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    </div>
  );
}
