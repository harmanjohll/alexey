import { useState } from 'react';

export default function QuizModal({ quiz, moduleId, onClose }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(null);

  const questions = quiz?.questions || [];

  const handleSelect = (qIdx, optIdx) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  const handleSubmit = async () => {
    let correct = 0;
    questions.forEach((q, i) => {
      if (answers[i] === q.correctIndex) correct++;
    });
    const pct = Math.round((correct / questions.length) * 100);
    setScore({ correct, total: questions.length, pct, passed: pct >= 80 });
    setSubmitted(true);

    try {
      await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'alexey',
          moduleId,
          score: pct,
          passed: pct >= 80,
        }),
      });
    } catch (e) {
      console.error('Failed to save quiz score:', e);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-lab-surface border border-lab-border rounded-lg max-w-xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-lab-border">
          <span className="font-mono text-sm font-bold">Module Quiz</span>
          <button onClick={onClose} className="text-lab-muted hover:text-lab-text text-lg">×</button>
        </div>

        <div className="p-5 space-y-6">
          {questions.map((q, qIdx) => (
            <div key={qIdx}>
              <div className="font-mono text-xs text-lab-muted mb-1">Question {qIdx + 1} of {questions.length}</div>
              <p className="text-sm text-lab-text mb-3">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, oIdx) => {
                  const selected = answers[qIdx] === oIdx;
                  const isCorrect = submitted && oIdx === q.correctIndex;
                  const isWrong = submitted && selected && oIdx !== q.correctIndex;
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleSelect(qIdx, oIdx)}
                      className={`w-full text-left px-3 py-2 rounded border text-sm font-mono transition-colors ${
                        isCorrect
                          ? 'border-lab-green bg-lab-green/10 text-lab-green'
                          : isWrong
                          ? 'border-lab-red bg-lab-red/10 text-lab-red'
                          : selected
                          ? 'border-lab-blue bg-lab-blue/10 text-lab-blue'
                          : 'border-lab-border hover:border-lab-muted text-lab-text'
                      }`}
                    >
                      <span className="text-lab-muted mr-2">{String.fromCharCode(65 + oIdx)}.</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-lab-border flex items-center justify-between">
          {submitted && score ? (
            <div className={`font-mono text-sm ${score.passed ? 'text-lab-green' : 'text-lab-red'}`}>
              {score.correct}/{score.total} ({score.pct}%) — {score.passed ? 'Passed!' : 'Need 80% to pass. Try again.'}
            </div>
          ) : (
            <div className="font-mono text-xs text-lab-muted">
              {Object.keys(answers).length}/{questions.length} answered
            </div>
          )}
          {!submitted ? (
            <button
              onClick={handleSubmit}
              disabled={Object.keys(answers).length < questions.length}
              className="font-mono text-xs px-4 py-2 rounded border border-lab-green/50 text-lab-green hover:bg-lab-green/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={onClose}
              className="font-mono text-xs px-4 py-2 rounded border border-lab-border text-lab-muted hover:text-lab-text transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
