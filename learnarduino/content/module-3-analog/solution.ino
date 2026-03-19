/*
 * Module 3: Analog Input — Potentiometer-Controlled Blink Rate (SOLUTION)
 *
 * Reads a potentiometer and uses the value to control LED blink speed.
 *
 * CIRCUIT:
 *   - Potentiometer: left pin → 5V, middle pin → A0, right pin → GND
 *   - LED on pin 13 (built-in)
 */

int potPin = A0;
int ledPin = 13;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int potValue = analogRead(potPin);

  // Map 0-1023 to 50-1000 milliseconds
  int blinkDelay = map(potValue, 0, 1023, 50, 1000);

  // Print the delay to Serial Monitor
  Serial.print("Pot: ");
  Serial.print(potValue);
  Serial.print("  Delay: ");
  Serial.println(blinkDelay);

  // Blink with the mapped delay
  digitalWrite(ledPin, HIGH);
  delay(blinkDelay);
  digitalWrite(ledPin, LOW);
  delay(blinkDelay);
}
