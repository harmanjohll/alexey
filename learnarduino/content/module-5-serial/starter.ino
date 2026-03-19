/*
 * Module 5: Serial Communication — Serial-Controlled LED Brightness
 *
 * GOAL: Type a digit 0-9 in the Serial Monitor to set LED brightness.
 *       0 = off, 9 = full brightness.
 *       Print confirmation with the PWM value.
 *       Handle invalid input gracefully.
 *
 * CIRCUIT:
 *   - LED on pin 9 (PWM pin)
 */

int ledPin = 9;

void setup() {
  // TODO 1: Start serial at 9600 baud


  // TODO 2: Set ledPin as OUTPUT


  // TODO 3: Print a welcome message telling the user what to do
  // Serial.println("LED Brightness Controller");
  // Serial.println("Type 0-9 to set brightness:");

}

void loop() {
  // TODO 4: Check if serial data is available
  // if (Serial.available() > 0) {


    // TODO 5: Read one character from Serial
    // char incoming = Serial.read();


    // TODO 6: Check if the character is a digit between '0' and '9'
    //         HINT: Characters have an order. '0' < '1' < '2' ... < '9'
    // if (incoming >= '0' && incoming <= '9') {


      // TODO 7: Convert the character to a number (0-9)
      //         HINT: int level = incoming - '0';


      // TODO 8: Map the level (0-9) to PWM range (0-255)
      // int pwmValue = map(level, 0, 9, 0, 255);


      // TODO 9: Set the LED brightness with analogWrite
      // analogWrite(ledPin, pwmValue);


      // TODO 10: Print confirmation
      //          Format: "Brightness set to: 5 (PWM: 141)"
      // Serial.print("Brightness set to: ");
      // Serial.print(level);
      // Serial.print(" (PWM: ");
      // Serial.print(pwmValue);
      // Serial.println(")");


    // } else {
      // TODO 11: Print an error for invalid input
      //          But ignore newline characters ('\n' and '\r')
      // if (incoming != '\n' && incoming != '\r') {
      //   Serial.print("Invalid input: '");
      //   Serial.print(incoming);
      //   Serial.println("' — please type 0-9");
      // }
    // }

  // }
}
