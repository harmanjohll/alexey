import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const badges = [
  { id: 'first-blink', name: 'First Blink', desc: 'Complete Module 1', icon: '💡' },
  { id: 'button-master', name: 'Button Master', desc: 'Complete Module 2', icon: '🔘' },
  { id: 'serial-detective', name: 'Serial Detective', desc: 'Complete Module 5', icon: '🔍' },
  { id: 'pwm-wizard', name: 'PWM Wizard', desc: 'Complete Module 4', icon: '🌊' },
  { id: 'final-builder', name: 'Final Builder', desc: 'Complete Module 10', icon: '🏗️' },
];

export default function Dashboard() {
  const [progress, setProgress] = useState({});
  const [quizScores, setQuizScores] = useState({});

  useEffect(() => {
    fetch('/api/progress/alexey')
      .then(r => r.ok ? r.json() : {})
      .then(setProgress)
      .catch(() => {});
  }, []);

  const completedCount = Object.values(progress).filter(p => p?.completed).length;

  return (
    <div className="min-h-screen bg-lab-bg">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <Link to="/" className="font-mono text-xs text-lab-muted border border-lab-border px-3 py-1.5 rounded hover:text-lab-blue hover:border-lab-blue transition-colors inline-block mb-8">
          ← Back to modules
        </Link>

        <h1 className="font-mono text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-lab-muted mb-8">Track your progress through the Arduino curriculum.</p>

        {/* Progress Overview */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-lab-surface border border-lab-border rounded-lg p-5">
            <div className="font-mono text-3xl font-bold text-lab-green">{completedCount}</div>
            <div className="text-xs text-lab-muted mt-1">Modules completed</div>
          </div>
          <div className="bg-lab-surface border border-lab-border rounded-lg p-5">
            <div className="font-mono text-3xl font-bold text-lab-blue">{10 - completedCount}</div>
            <div className="text-xs text-lab-muted mt-1">Remaining</div>
          </div>
          <div className="bg-lab-surface border border-lab-border rounded-lg p-5">
            <div className="font-mono text-3xl font-bold text-lab-text">{Math.round(completedCount / 10 * 100)}%</div>
            <div className="text-xs text-lab-muted mt-1">Overall progress</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-lab-surface border border-lab-border rounded-lg p-5 mb-8">
          <div className="font-mono text-xs text-lab-muted mb-3 uppercase tracking-wider">Module Completion</div>
          <div className="flex gap-1">
            {Array.from({ length: 10 }, (_, i) => (
              <div
                key={i}
                className={`h-8 flex-1 rounded ${
                  progress[`module-${i + 1}-*`]?.completed
                    ? 'bg-lab-green'
                    : 'bg-lab-border/40'
                }`}
                title={`Module ${i + 1}`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2">
            <span className="font-mono text-[10px] text-lab-muted">01</span>
            <span className="font-mono text-[10px] text-lab-muted">10</span>
          </div>
        </div>

        {/* Badges */}
        <div className="bg-lab-surface border border-lab-border rounded-lg p-5">
          <div className="font-mono text-xs text-lab-muted mb-4 uppercase tracking-wider">Badges</div>
          <div className="grid grid-cols-5 gap-3">
            {badges.map(badge => {
              const earned = false; // TODO: check against progress
              return (
                <div key={badge.id} className={`text-center p-3 rounded-lg border ${earned ? 'border-lab-green/40 bg-lab-green/5' : 'border-lab-border/30 opacity-40'}`}>
                  <div className="text-2xl mb-1">{badge.icon}</div>
                  <div className="font-mono text-[10px] text-lab-text">{badge.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
