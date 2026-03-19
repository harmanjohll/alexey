/*
 * Module 4: PWM & AnalogWrite — Potentiometer-Controlled LED Brightness
 *
 * GOAL: Use a potentiometer to smoothly control LED brightness.
 *       Read the pot → map to 0-255 → write to LED with analogWrite.
 *       Print both values to Serial Monitor.
 *
 * CIRCUIT:
 *   - LED on pin 9 (must be a PWM pin, marked with ~)
 *   - Potentiometer: left pin → 5V, middle pin → A0, right pin → GND
 */

int potPin = A0;
int ledPin = 9;   // PWM-capable pin

void setup() {
  // TODO 1: Start serial at 9600 baud


  // TODO 2: Set ledPin as OUTPUT

}

void loop() {
  // TODO 3: Read the potentiometer (0-1023)
  // int potValue = analogRead(???);


  // TODO 4: Map the pot value from 0-1023 to 0-255 (PWM range)
  //         Why 255? Because analogWrite uses 8-bit resolution.
  // int brightness = map(potValue, 0, 1023, 0, 255);


  // TODO 5: Write the brightness to the LED using analogWrite()
  //         NOTE: This is NOT the same as digitalWrite!
  // analogWrite(ledPin, ???);


  // TODO 6: Print both values to Serial for debugging
  //         Format: "Pot: 512  Brightness: 127"
  // Serial.print("Pot: ");
  // Serial.print(potValue);
  // Serial.print("  Brightness: ");
  // Serial.println(brightness);


  delay(10);  // Small delay for stability
}
