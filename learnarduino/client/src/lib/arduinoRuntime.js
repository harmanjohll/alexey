/**
 * Arduino Runtime Shim for avr8js
 *
 * Maps Arduino API functions (digitalWrite, pinMode, etc.) to
 * AVR register addresses for the ATmega328P.
 *
 * Phase 1: Defines the register map and constants.
 * Phase 3: Will be used to bridge compiled hex execution with wokwi-elements.
 */

// ATmega328P register addresses
export const REGISTERS = {
  PORTB: 0x25,  // Digital pins 8-13
  DDRB: 0x24,   // Data direction for port B
  PINB: 0x23,   // Input pins for port B
  PORTC: 0x28,  // Analog pins A0-A5
  DDRC: 0x27,
  PINC: 0x26,
  PORTD: 0x2b,  // Digital pins 0-7
  DDRD: 0x2a,
  PIND: 0x29,
};

// Arduino pin to AVR port/bit mapping
export const PIN_MAP = {
  0: { port: 'D', bit: 0 },
  1: { port: 'D', bit: 1 },
  2: { port: 'D', bit: 2 },
  3: { port: 'D', bit: 3 },
  4: { port: 'D', bit: 4 },
  5: { port: 'D', bit: 5 },
  6: { port: 'D', bit: 6 },
  7: { port: 'D', bit: 7 },
  8: { port: 'B', bit: 0 },
  9: { port: 'B', bit: 1 },
  10: { port: 'B', bit: 2 },
  11: { port: 'B', bit: 3 },
  12: { port: 'B', bit: 4 },
  13: { port: 'B', bit: 5 },  // Built-in LED
};

export const HIGH = 1;
export const LOW = 0;
export const OUTPUT = 1;
export const INPUT = 0;
export const INPUT_PULLUP = 2;
export const LED_BUILTIN = 13;

/**
 * Parse Intel HEX format string into a Uint8Array program buffer
 */
export function parseHex(hexString) {
  const lines = hexString.split('\n').filter(l => l.startsWith(':'));
  const chunks = [];
  let maxAddr = 0;

  for (const line of lines) {
    const byteCount = parseInt(line.substring(1, 3), 16);
    const address = parseInt(line.substring(3, 7), 16);
    const recordType = parseInt(line.substring(7, 9), 16);

    if (recordType === 0) {
      const data = [];
      for (let i = 0; i < byteCount; i++) {
        data.push(parseInt(line.substring(9 + i * 2, 11 + i * 2), 16));
      }
      chunks.push({ address, data });
      maxAddr = Math.max(maxAddr, address + byteCount);
    }
  }

  const program = new Uint8Array(maxAddr);
  for (const chunk of chunks) {
    program.set(chunk.data, chunk.address);
  }

  return program;
}
