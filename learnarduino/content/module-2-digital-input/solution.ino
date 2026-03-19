/*
 * Module 2: Digital Input — Pushbutton Toggle (SOLUTION)
 *
 * Press the button once → LED stays on.
 * Press again → LED turns off.
 *
 * CIRCUIT:
 *   - LED on pin 13 (built-in)
 *   - Pushbutton: one leg to pin 2, opposite leg to GND
 */

int buttonPin = 2;
int ledPin = 13;

bool ledOn = false;
int lastButtonState = HIGH;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int currentButtonState = digitalRead(buttonPin);

  // Detect the moment the button is pressed (transition from HIGH to LOW)
  if (lastButtonState == HIGH && currentButtonState == LOW) {
    // Flip the LED state
    ledOn = !ledOn;
    digitalWrite(ledPin, ledOn ? HIGH : LOW);
  }

  // Remember this reading for next time
  lastButtonState = currentButtonState;

  // Small delay for debouncing
  delay(50);
}
