/*
 * Module 3: Analog Input — Potentiometer-Controlled Blink Rate
 *
 * GOAL: Read a potentiometer and use it to control how fast an LED blinks.
 *       - Pot fully left  → LED blinks slowly (1000ms delay)
 *       - Pot fully right → LED blinks fast (50ms delay)
 *       - Print the delay value to the Serial Monitor
 *
 * CIRCUIT:
 *   - Potentiometer: left pin → 5V, middle pin → A0, right pin → GND
 *   - LED on pin 13 (built-in)
 */

int potPin = A0;
int ledPin = 13;

void setup() {
  // TODO 1: Start serial communication at 9600 baud
  // Serial.begin(???);

  // TODO 2: Set ledPin as OUTPUT

}

void loop() {
  // TODO 3: Read the potentiometer value using analogRead()
  //         Store it in a variable called potValue
  // int potValue = ???;


  // TODO 4: Map potValue from 0-1023 to a delay range of 50-1000
  //         Use: int blinkDelay = map(potValue, 0, 1023, 50, 1000);


  // TODO 5: Print the delay value to the Serial Monitor
  //         Use Serial.print() to label it, and Serial.println() for the value
  //         Example output: "Delay: 500"
  // Serial.print("Delay: ");
  // Serial.println(???);


  // TODO 6: Blink the LED using the mapped delay value
  //         Turn LED on, delay, turn LED off, delay
  // digitalWrite(ledPin, HIGH);
  // delay(???);
  // digitalWrite(ledPin, LOW);
  // delay(???);
}
