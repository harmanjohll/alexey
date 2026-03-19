/*
 * Module 4: PWM & AnalogWrite — Potentiometer-Controlled LED Brightness (SOLUTION)
 *
 * Reads a potentiometer and maps the value to LED brightness using PWM.
 *
 * CIRCUIT:
 *   - LED on pin 9 (PWM pin)
 *   - Potentiometer: left pin → 5V, middle pin → A0, right pin → GND
 */

int potPin = A0;
int ledPin = 9;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  int potValue = analogRead(potPin);

  // Map from 10-bit ADC range to 8-bit PWM range
  int brightness = map(potValue, 0, 1023, 0, 255);

  // Set LED brightness
  analogWrite(ledPin, brightness);

  // Debug output
  Serial.print("Pot: ");
  Serial.print(potValue);
  Serial.print("  Brightness: ");
  Serial.println(brightness);

  delay(10);
}
