import { useParams, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Editor from '../components/Editor';
import Simulator from '../components/Simulator';
import LessonPanel from '../components/LessonPanel';
import Terminal from '../components/Terminal';
import QuizModal from '../components/QuizModal';
import DiagramViewer from '../components/DiagramViewer';

export default function Lesson() {
  const { moduleId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [code, setCode] = useState('');
  const [running, setRunning] = useState(false);
  const [serialOutput, setSerialOutput] = useState([]);
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeTab, setActiveTab] = useState('lesson');
  const [hexData, setHexData] = useState(null);

  useEffect(() => {
    fetch(`/api/lessons/${moduleId}`)
      .then(r => r.json())
      .then(data => {
        setLesson(data);
        setCode(data.starterCode || '');
      })
      .catch(console.error);
  }, [moduleId]);

  const handleRun = async () => {
    setSerialOutput([]);
    setRunning(true);
    // For Phase 1, fetch pre-compiled hex from server
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, moduleId }),
      });
      const data = await res.json();
      if (data.hex) {
        setHexData(data.hex);
      }
    } catch (err) {
      setSerialOutput(prev => [...prev, `[Error] ${err.message}`]);
      setRunning(false);
    }
  };

  const handleStop = () => {
    setRunning(false);
    setHexData(null);
  };

  const handleSerialWrite = (text) => {
    setSerialOutput(prev => [...prev, text]);
  };

  if (!lesson) {
    return (
      <div className="min-h-screen bg-lab-bg flex items-center justify-center">
        <div className="font-mono text-lab-muted animate-pulse">Loading module...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-lab-bg flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-lab-border bg-lab-surface shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="font-mono text-xs text-lab-muted hover:text-lab-blue transition-colors">
            ← Modules
          </Link>
          <span className="text-lab-border">|</span>
          <span className="font-mono text-xs px-2 py-0.5 rounded bg-lab-green/15 text-lab-green border border-lab-green/40">
            {moduleId.replace('module-', '').replace(/-/g, ' ').replace(/^\d+\s*/, m => m.trim().padStart(2, '0') + ' · ')}
          </span>
          <span className="font-mono text-sm font-bold">{lesson.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowQuiz(true)}
            className="font-mono text-xs px-3 py-1.5 border border-lab-border rounded hover:border-lab-blue hover:text-lab-blue transition-colors"
          >
            Take Quiz
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel — Lesson Content */}
        <div className="w-[420px] border-r border-lab-border flex flex-col shrink-0">
          <div className="flex border-b border-lab-border">
            {['lesson', 'diagram', 'reference'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 font-mono text-[10px] uppercase tracking-wider py-2 transition-colors ${
                  activeTab === tab
                    ? 'text-lab-green border-b-2 border-lab-green bg-lab-panel'
                    : 'text-lab-muted hover:text-lab-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'lesson' && <LessonPanel content={lesson.content} />}
            {activeTab === 'diagram' && <DiagramViewer svg={lesson.circuitSvg} />}
            {activeTab === 'reference' && (
              <div className="p-4 text-xs text-lab-muted font-mono">
                Reference panel — coming in Phase 2
              </div>
            )}
          </div>
        </div>

        {/* Right Panel — Editor + Simulator */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Editor */}
          <div className="flex-1 min-h-0">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-lab-border bg-lab-surface">
              <span className="font-mono text-[10px] text-lab-muted uppercase tracking-wider">sketch.ino</span>
              <div className="flex gap-2">
                {running ? (
                  <button
                    onClick={handleStop}
                    className="font-mono text-[10px] px-3 py-1 rounded border border-lab-red/50 text-lab-red hover:bg-lab-red/10 transition-colors"
                  >
                    ■ Stop
                  </button>
                ) : (
                  <button
                    onClick={handleRun}
                    className="font-mono text-[10px] px-3 py-1 rounded border border-lab-green/50 text-lab-green hover:bg-lab-green/10 transition-colors"
                  >
                    ▶ Run
                  </button>
                )}
              </div>
            </div>
            <Editor code={code} onChange={setCode} />
          </div>

          {/* Bottom: Simulator + Terminal */}
          <div className="h-[280px] border-t border-lab-border flex shrink-0">
            <div className="flex-1 border-r border-lab-border">
              <div className="px-3 py-1.5 border-b border-lab-border bg-lab-surface">
                <span className="font-mono text-[10px] text-lab-muted uppercase tracking-wider">
                  Simulator
                  {running && <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-lab-green animate-pulse" />}
                </span>
              </div>
              <Simulator
                running={running}
                hexData={hexData}
                onSerialWrite={handleSerialWrite}
                onStop={handleStop}
              />
            </div>
            <div className="w-[320px]">
              <Terminal lines={serialOutput} onClear={() => setSerialOutput([])} />
            </div>
          </div>
        </div>
      </div>

      {showQuiz && lesson.quiz && (
        <QuizModal
          quiz={lesson.quiz}
          moduleId={moduleId}
          onClose={() => setShowQuiz(false)}
        />
      )}
    </div>
  );
}
