import { useState, useEffect, useCallback } from 'react';

export function useProgress(studentId = 'alexey') {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/progress/${studentId}`)
      .then(r => r.ok ? r.json() : {})
      .then(data => {
        setProgress(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [studentId]);

  const updateProgress = useCallback(async (moduleId, data) => {
    try {
      const res = await fetch(`/api/progress/${studentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, ...data }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProgress(prev => ({ ...prev, [moduleId]: updated }));
      }
    } catch (e) {
      console.error('Failed to update progress:', e);
    }
  }, [studentId]);

  return { progress, loading, updateProgress };
}
