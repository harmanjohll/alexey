import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';

const modules = [
  { id: 'module-1-blink', num: 1, title: 'Blink', desc: 'digitalWrite, pinMode, loop/setup, delay', tags: ['digital output', 'basics'] },
  { id: 'module-2-digital-input', num: 2, title: 'Digital Input', desc: 'Pushbutton, digitalRead, if/else', tags: ['digital input', 'logic'] },
  { id: 'module-3-analog', num: 3, title: 'Analog Input', desc: 'analogRead, potentiometer, Serial.println', tags: ['analog', 'serial'] },
  { id: 'module-4-pwm', num: 4, title: 'PWM & AnalogWrite', desc: 'LED fade, analogWrite, duty cycle', tags: ['PWM', 'analog output'] },
  { id: 'module-5-serial', num: 5, title: 'Serial Communication', desc: 'Serial monitor, debugging, Serial.read', tags: ['serial', 'debug'] },
  { id: 'module-6-servo', num: 6, title: 'Servo Control', desc: 'Servo library, sweep, position mapping', tags: ['servo', 'library'] },
  { id: 'module-7-lcd', num: 7, title: 'LCD Display', desc: 'LiquidCrystal, I2C, printing variables', tags: ['LCD', 'I2C'] },
  { id: 'module-8-sensors', num: 8, title: 'Sensors', desc: 'DHT11 temp/humidity, ultrasonic HC-SR04', tags: ['sensors', 'data'] },
  { id: 'module-9-state-machines', num: 9, title: 'State Machines', desc: 'Traffic light project, enum states', tags: ['state', 'design'] },
  { id: 'module-10-final-project', num: 10, title: 'Final Project', desc: 'Design, build, simulate, document', tags: ['capstone', 'open-ended'] },
];

export default function Home() {
  const [progress, setProgress] = useState({});

  useEffect(() => {
    fetch('/api/progress/alexey')
      .then(r => r.ok ? r.json() : {})
      .then(setProgress)
      .catch(() => {});
  }, []);

  const getStatus = (moduleId) => {
    const p = progress[moduleId];
    if (!p) return 'locked';
    if (p.completed) return 'completed';
    if (p.started) return 'in-progress';
    return 'locked';
  };

  const isUnlocked = (idx) => {
    if (idx === 0) return true;
    const prevId = modules[idx - 1].id;
    return progress[prevId]?.completed;
  };

  return (
    <div className="min-h-screen bg-lab-bg">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-lab-green animate-pulse" />
            <span className="font-mono text-xs text-lab-muted tracking-widest uppercase">ArduinoLab v1.0</span>
          </div>
          <h1 className="font-mono text-4xl font-bold text-lab-text mb-3">
            Arduino Learning Platform
          </h1>
          <p className="text-lab-muted text-lg max-w-2xl">
            From blinking an LED to building state machines. 10 modules that take you from zero to embedded systems fluency.
          </p>
          <div className="flex gap-4 mt-6">
            <Link to="/dashboard" className="font-mono text-xs px-4 py-2 border border-lab-border rounded hover:border-lab-blue hover:text-lab-blue transition-colors">
              Dashboard →
            </Link>
          </div>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((mod, idx) => {
            const unlocked = isUnlocked(idx);
            const status = unlocked ? getStatus(mod.id) : 'locked';
            return (
              <Link
                key={mod.id}
                to={unlocked ? `/lesson/${mod.id}` : '#'}
                className={`block border rounded-lg p-5 transition-all ${
                  unlocked
                    ? 'border-lab-border bg-lab-surface hover:border-lab-green hover:bg-lab-panel cursor-pointer'
                    : 'border-lab-border/50 bg-lab-bg opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className={`font-mono text-xs px-2 py-0.5 rounded border ${
                    status === 'completed'
                      ? 'bg-lab-green/15 text-lab-green border-lab-green/40'
                      : status === 'in-progress'
                      ? 'bg-lab-blue/15 text-lab-blue border-lab-blue/40'
                      : 'bg-lab-border/30 text-lab-muted border-lab-border'
                  }`}>
                    {String(mod.num).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] text-lab-muted uppercase tracking-wider">
                    {status === 'completed' ? '✓ Complete' : status === 'in-progress' ? '● In Progress' : status === 'locked' ? '🔒 Locked' : 'Ready'}
                  </span>
                </div>
                <h3 className="font-mono text-sm font-bold text-lab-text mb-1">{mod.title}</h3>
                <p className="text-xs text-lab-muted mb-3">{mod.desc}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {mod.tags.map(tag => (
                    <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-lab-border/40 text-lab-muted">
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-lab-border/50">
          <p className="text-xs text-lab-muted font-mono">
            Alexey Mikhail Johll · Singapore · 2025–2026
          </p>
        </div>
      </div>
    </div>
  );
}
