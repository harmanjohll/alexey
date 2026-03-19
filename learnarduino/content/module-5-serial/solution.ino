/*
 * Module 5: Serial Communication — Serial-Controlled LED Brightness (SOLUTION)
 *
 * Type a digit 0-9 in the Serial Monitor to control LED brightness.
 *
 * CIRCUIT:
 *   - LED on pin 9 (PWM pin)
 */

int ledPin = 9;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);

  Serial.println("=== LED Brightness Controller ===");
  Serial.println("Type a digit 0-9 to set brightness:");
  Serial.println("  0 = OFF");
  Serial.println("  9 = FULL BRIGHTNESS");
  Serial.println();
}

void loop() {
  if (Serial.available() > 0) {
    char incoming = Serial.read();

    if (incoming >= '0' && incoming <= '9') {
      // Convert character to number
      int level = incoming - '0';

      // Map 0-9 to 0-255 PWM range
      int pwmValue = map(level, 0, 9, 0, 255);

      // Set LED brightness
      analogWrite(ledPin, pwmValue);

      // Print confirmation
      Serial.print("Brightness set to: ");
      Serial.print(level);
      Serial.print(" (PWM: ");
      Serial.print(pwmValue);
      Serial.println(")");

    } else {
      // Ignore newline/carriage return characters
      if (incoming != '\n' && incoming != '\r') {
        Serial.print("Invalid input: '");
        Serial.print(incoming);
        Serial.println("' — please type a digit 0-9");
      }
    }
  }
}
