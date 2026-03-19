/*
 * Module 6: Servo Control — Potentiometer + Serial Servo Controller
 *
 * GOAL: Control a servo two ways:
 *   1. Turn the potentiometer to move the servo (0-180 degrees)
 *   2. Type an angle in Serial Monitor to jump to that position
 *   Print the current angle to Serial.
 *
 * CIRCUIT:
 *   - Servo signal wire → pin 9
 *   - Servo power → 5V, Servo ground → GND
 *   - Potentiometer: left → 5V, middle → A0, right → GND
 */

// TODO 1: Include the Servo library
// #include <Servo.h>

// TODO 2: Create a Servo object
// Servo myServo;

int potPin = A0;
int lastPotAngle = -1;  // Track last pot angle to detect changes

void setup() {
  // TODO 3: Start Serial at 9600 baud


  // TODO 4: Attach the servo to pin 9
  // myServo.attach(9);


  Serial.println("=== Servo Controller ===");
  Serial.println("Turn the pot or type an angle (0-180):");
}

void loop() {
  // --- Potentiometer control ---

  // TODO 5: Read the potentiometer value
  // int potValue = analogRead(potPin);


  // TODO 6: Map the pot value (0-1023) to servo angle (0-180)
  // int potAngle = map(potValue, 0, 1023, 0, 180);


  // TODO 7: Only update the servo if the pot angle has changed
  //         This prevents the pot from overriding serial commands
  //         when the pot isn't being moved.
  // if (abs(potAngle - lastPotAngle) > 2) {
  //   myServo.write(potAngle);
  //   lastPotAngle = potAngle;
  //
  //   Serial.print("Pot → Angle: ");
  //   Serial.println(potAngle);
  // }


  // --- Serial command control ---

  // TODO 8: Check if serial data is available
  // if (Serial.available() > 0) {

    // TODO 9: Read the integer from Serial
    // int serialAngle = Serial.parseInt();

    // TODO 10: Constrain the angle to valid range 0-180
    //          and write it to the servo
    // if (serialAngle >= 0 && serialAngle <= 180) {
    //   myServo.write(serialAngle);
    //   Serial.print("Serial → Angle: ");
    //   Serial.println(serialAngle);
    // } else {
    //   Serial.println("Invalid angle. Use 0-180.");
    // }

  // }

  delay(20);
}
