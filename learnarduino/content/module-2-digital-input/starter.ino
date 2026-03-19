/*
 * Module 2: Digital Input — Pushbutton Toggle
 *
 * GOAL: Make an LED toggle on/off each time you press the button.
 *       Press once → LED stays on. Press again → LED turns off.
 *
 * CIRCUIT:
 *   - LED on pin 13 (built-in)
 *   - Pushbutton: one leg to pin 2, opposite leg to GND
 *
 * HINT: You need to detect the MOMENT the button is pressed,
 *       not just whether it's currently held down.
 */

int buttonPin = 2;
int ledPin = 13;

// TODO 1: Declare a variable to store the LED state (on or off).
//         Use: bool ledOn = false;


// TODO 2: Declare a variable to remember the PREVIOUS button reading.
//         Use: int lastButtonState = HIGH;


void setup() {
  // TODO 3: Set buttonPin as INPUT_PULLUP


  // TODO 4: Set ledPin as OUTPUT

}

void loop() {
  // TODO 5: Read the current button state using digitalRead()
  // int currentButtonState = ???;


  // TODO 6: Check if the button was just pressed.
  //         "Just pressed" means: it WAS HIGH (not pressed) last time,
  //         and NOW it is LOW (pressed).
  //
  // if (lastButtonState == HIGH && currentButtonState == LOW) {
  //   TODO 7: Flip the LED state. If it was on, turn it off. If off, turn on.
  //           HINT: ledOn = !ledOn;
  //
  //   TODO 8: Write the LED state to the pin.
  //           Use digitalWrite(ledPin, ledOn ? HIGH : LOW);
  // }


  // TODO 9: Save the current button state as lastButtonState
  //         so we can compare next time through the loop.
  // lastButtonState = currentButtonState;


  // Small delay for button debouncing
  delay(50);
}
