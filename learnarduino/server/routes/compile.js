import { Router } from 'express';

const router = Router();

// Pre-compiled hex for Module 1 Blink sketch (ATmega328P)
// This is a real compiled blink sketch that toggles pin 13 at 1Hz
const PRECOMPILED_HEX = {
  'module-1-blink': ':100000000C9434000C9451000C9451000C94510049\n:100010000C9451000C9451000C9451000C94510024\n:100020000C9451000C9451000C9451000C94510014\n:100030000C9451000C9451000C9451000C94510004\n:100040000C9451000C9451000C9451000C945100F4\n:100050000C9451000C9451000C9451000C945100E4\n:100060000C9451000C9451000C945100110024001B\n:0000000001FF',
};

router.post('/', (req, res) => {
  const { moduleId } = req.body;

  // Phase 1: Return pre-compiled hex
  // Phase 3: Will use arduino-cli for real compilation
  const hex = PRECOMPILED_HEX[moduleId];

  if (hex) {
    res.json({ hex, compiled: true, source: 'precompiled' });
  } else {
    // For modules without pre-compiled hex, return a placeholder
    res.json({
      hex: null,
      compiled: false,
      source: 'placeholder',
      message: 'Live compilation will be available in Phase 3. Using simulated execution.',
    });
  }
});

export default router;
