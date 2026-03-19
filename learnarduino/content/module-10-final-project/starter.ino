/*
 * Module 10: Final Project — Reaction Time Game (Starter Template)
 *
 * This is ONE possible final project. You may modify it completely
 * or build something entirely different.
 *
 * GOAL: Build a reaction time game.
 *   - An LED lights up after a random delay
 *   - Player presses a button as fast as possible
 *   - Display reaction time on Serial (or LCD if available)
 *   - Track the best score across rounds
 *
 * CONCEPTS USED:
 *   - Digital output (LEDs)
 *   - Digital input (button with INPUT_PULLUP)
 *   - millis() for precise timing
 *   - State machine (WAITING, READY, REACT, RESULT)
 *   - Serial communication
 *   - random() for unpredictable delays
 *
 * CIRCUIT:
 *   - LED on pin 9
 *   - Pushbutton on pin 2 (INPUT_PULLUP)
 *
 * TODO: Fill in the missing code to complete the game!
 */

int ledPin = 9;
int buttonPin = 2;

// TODO 1: Define the game states using enum
// enum GameState {
//   WAITING,    // Waiting for player to start a new round
//   COUNTDOWN,  // Random delay before LED turns on
//   REACT,      // LED is on — waiting for button press
//   RESULT      // Showing the result
// };

// TODO 2: Create game variables
// GameState currentState = WAITING;
// unsigned long stateStartTime = 0;
// unsigned long randomDelay = 0;
// unsigned long reactionTime = 0;
// unsigned long bestTime = 99999;  // Start with a very high "best"
// int roundCount = 0;

void setup() {
  Serial.begin(9600);

  // TODO 3: Set pin modes
  // pinMode(ledPin, OUTPUT);
  // pinMode(buttonPin, INPUT_PULLUP);

  // TODO 4: Seed the random number generator for unpredictable delays
  // randomSeed(analogRead(A0));  // Read unused analog pin for randomness

  // TODO 5: Print welcome message
  // Serial.println("=== REACTION TIME GAME ===");
  // Serial.println("Press the button to start a round.");
  // Serial.println("When the LED turns on, press as FAST as you can!");
  // Serial.println();
}

void loop() {
  unsigned long now = millis();
  int buttonState = digitalRead(buttonPin);

  // TODO 6: Implement the state machine
  // switch (currentState) {
  //
  //   case WAITING:
  //     // LED is off. Waiting for player to press button to start.
  //     if (buttonState == LOW) {
  //       // Button pressed — start countdown
  //       currentState = COUNTDOWN;
  //       randomDelay = random(1000, 5000);  // 1-5 second random wait
  //       stateStartTime = now;
  //       roundCount++;
  //       Serial.print("Round ");
  //       Serial.print(roundCount);
  //       Serial.println(": Get ready...");
  //       delay(300);  // Debounce
  //     }
  //     break;
  //
  //   case COUNTDOWN:
  //     // TODO 7: Wait for the random delay, then turn on LED
  //     // Check if player pressed too early (cheating!)
  //     if (buttonState == LOW) {
  //       Serial.println("TOO EARLY! Wait for the LED.");
  //       currentState = WAITING;
  //       delay(300);
  //     }
  //     else if (now - stateStartTime >= randomDelay) {
  //       // Time to react!
  //       digitalWrite(ledPin, HIGH);
  //       currentState = REACT;
  //       stateStartTime = now;
  //     }
  //     break;
  //
  //   case REACT:
  //     // TODO 8: LED is on — measure how fast the player presses
  //     if (buttonState == LOW) {
  //       reactionTime = now - stateStartTime;
  //       digitalWrite(ledPin, LOW);
  //       currentState = RESULT;
  //     }
  //     // Optional: timeout after 3 seconds
  //     if (now - stateStartTime >= 3000) {
  //       Serial.println("Too slow! Timed out.");
  //       digitalWrite(ledPin, LOW);
  //       currentState = WAITING;
  //     }
  //     break;
  //
  //   case RESULT:
  //     // TODO 9: Display the reaction time and check for best score
  //     Serial.print("Reaction time: ");
  //     Serial.print(reactionTime);
  //     Serial.println(" ms");
  //
  //     if (reactionTime < bestTime) {
  //       bestTime = reactionTime;
  //       Serial.print("*** NEW BEST! *** ");
  //     }
  //     Serial.print("Best time: ");
  //     Serial.print(bestTime);
  //     Serial.println(" ms");
  //     Serial.println("Press button for next round.");
  //     Serial.println();
  //
  //     currentState = WAITING;
  //     delay(500);  // Debounce before next round
  //     break;
  // }
}
