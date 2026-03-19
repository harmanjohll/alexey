/*
 * Module 6: Servo Control — Potentiometer + Serial Servo Controller (SOLUTION)
 *
 * Controls a servo via potentiometer or Serial Monitor commands.
 *
 * CIRCUIT:
 *   - Servo signal wire → pin 9
 *   - Servo power → 5V, Servo ground → GND
 *   - Potentiometer: left → 5V, middle → A0, right → GND
 */

#include <Servo.h>

Servo myServo;

int potPin = A0;
int lastPotAngle = -1;

void setup() {
  Serial.begin(9600);
  myServo.attach(9);

  Serial.println("=== Servo Controller ===");
  Serial.println("Turn the pot or type an angle (0-180):");
}

void loop() {
  // --- Potentiometer control ---
  int potValue = analogRead(potPin);
  int potAngle = map(potValue, 0, 1023, 0, 180);

  // Only update if pot has moved noticeably (deadband of 2 degrees)
  if (abs(potAngle - lastPotAngle) > 2) {
    myServo.write(potAngle);
    lastPotAngle = potAngle;

    Serial.print("Pot -> Angle: ");
    Serial.print(potAngle);
    Serial.println(" degrees");
  }

  // --- Serial command control ---
  if (Serial.available() > 0) {
    int serialAngle = Serial.parseInt();

    if (serialAngle >= 0 && serialAngle <= 180) {
      myServo.write(serialAngle);
      lastPotAngle = serialAngle;  // Update so pot doesn't immediately override

      Serial.print("Serial -> Angle: ");
      Serial.print(serialAngle);
      Serial.println(" degrees");
    } else {
      Serial.println("Invalid angle. Please use 0-180.");
    }
  }

  delay(20);
}
