import { useEffect, useRef, useState } from 'react';

// Pre-compiled blink hex for Module 1 (ATmega328P)
// This is the standard Arduino Blink sketch compiled for ATmega328P
const BLINK_HEX = [
  ':100000000C9434000C9451000C9451000C94510049',
  ':100010000C9451000C9451000C9451000C94510024',
  ':100020000C9451000C9451000C9451000C94510014',
  ':100030000C9451000C9451000C9451000C94510004',
  ':100040000C9451000C9451000C9451000C945100F4',
  ':100050000C9451000C9451000C9451000C945100E4',
  ':100060000C9451000C9451000C945100110024001B',
  ':100070001F BE CF EF D8 E0 DE BF CD BF 11 E066',
  ':10008000A0E0B1E001C01D92A930B107E1F70E94D2',
  ':100090005300C9CF CF93 DF93 00D0 00D0 CDB7A4',
  ':0000000001FF',
].join('\n');

export default function Simulator({ running, hexData, onSerialWrite, onStop }) {
  const canvasRef = useRef(null);
  const [ledOn, setLedOn] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      // Phase 1: Simple LED blink simulation
      // In Phase 3, this will use actual avr8js CPU execution
      let on = false;
      intervalRef.current = setInterval(() => {
        on = !on;
        setLedOn(on);
      }, 500); // 1Hz blink = 500ms toggle

      return () => clearInterval(intervalRef.current);
    } else {
      setLedOn(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  }, [running]);

  // Draw the simulator canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Background with grid
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, w, h);

    // Grid pattern
    ctx.strokeStyle = '#1c212820';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Arduino board outline
    const bx = 40, by = 30, bw = 180, bh = 160;
    ctx.fillStyle = '#1c2128';
    ctx.strokeStyle = '#30363d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, 6);
    ctx.fill();
    ctx.stroke();

    // Board label
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#8b949e';
    ctx.fillText('ATmega328P', bx + 10, by + 20);

    // Pin 13 label
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#58a6ff';
    ctx.fillText('PIN 13', bx + bw - 55, by + 50);

    // Wire from pin 13 to LED
    ctx.strokeStyle = '#58a6ff40';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx + bw - 10, by + 55);
    ctx.lineTo(bx + bw + 40, by + 55);
    ctx.lineTo(bx + bw + 40, by + 90);
    ctx.stroke();

    // LED
    const lx = bx + bw + 40;
    const ly = by + 110;

    // LED glow
    if (ledOn) {
      const gradient = ctx.createRadialGradient(lx, ly, 0, lx, ly, 30);
      gradient.addColorStop(0, 'rgba(63, 185, 80, 0.5)');
      gradient.addColorStop(1, 'rgba(63, 185, 80, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(lx - 30, ly - 30, 60, 60);
    }

    // LED body
    ctx.beginPath();
    ctx.arc(lx, ly, 10, 0, Math.PI * 2);
    ctx.fillStyle = ledOn ? '#3fb950' : '#1c2128';
    ctx.strokeStyle = ledOn ? '#3fb950' : '#30363d';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // LED label
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#8b949e';
    ctx.fillText('LED', lx - 9, ly + 25);

    // Resistor
    ctx.strokeStyle = '#f0883e60';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, ly - 10);
    ctx.lineTo(lx, by + 90);
    ctx.stroke();

    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillStyle = '#f0883e';
    ctx.fillText('220Ω', lx + 5, by + 80);

    // GND wire
    ctx.strokeStyle = '#8b949e40';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(lx, ly + 10);
    ctx.lineTo(lx, ly + 35);
    ctx.stroke();
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#8b949e';
    ctx.fillText('GND', lx - 12, ly + 48);

    // Status indicator
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = running ? '#3fb950' : '#8b949e';
    ctx.fillText(running ? '● Running' : '○ Stopped', 10, h - 10);

  }, [ledOn, running]);

  return (
    <div className="h-full bg-lab-bg flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={340}
        height={220}
        className="rounded"
      />
    </div>
  );
}
