import { useState, useCallback, useRef } from 'react';

export function useSimulator() {
  const [running, setRunning] = useState(false);
  const [serialOutput, setSerialOutput] = useState([]);
  const timerRef = useRef(null);

  const start = useCallback((hexData) => {
    setRunning(true);
    // Phase 1: Simulated execution
    // Phase 3: Will use avr8js CPU with actual hex
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearSerial = useCallback(() => {
    setSerialOutput([]);
  }, []);

  return { running, serialOutput, start, stop, clearSerial };
}
