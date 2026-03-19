/*
 * Module 10: Final Project — Reaction Time Game (SOLUTION)
 *
 * A complete reaction time game using state machines, millis(),
 * digital I/O, and serial communication.
 *
 * CIRCUIT:
 *   - LED on pin 9
 *   - Pushbutton on pin 2 (INPUT_PULLUP)
 */

int ledPin = 9;
int buttonPin = 2;

enum GameState {
  WAITING,
  COUNTDOWN,
  REACT,
  RESULT
};

GameState currentState = WAITING;
unsigned long stateStartTime = 0;
unsigned long randomDelay = 0;
unsigned long reactionTime = 0;
unsigned long bestTime = 99999;
int roundCount = 0;

void setup() {
  Serial.begin(9600);
  pinMode(ledPin, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);

  // Use floating analog pin as random seed
  randomSeed(analogRead(A0));

  Serial.println("=================================");
  Serial.println("    REACTION TIME GAME");
  Serial.println("=================================");
  Serial.println();
  Serial.println("Press the button to start a round.");
  Serial.println("When the LED turns on, press the");
  Serial.println("button as FAST as you can!");
  Serial.println();
}

void loop() {
  unsigned long now = millis();
  int buttonState = digitalRead(buttonPin);

  switch (currentState) {

    case WAITING:
      // LED off, waiting for player to start
      if (buttonState == LOW) {
        currentState = COUNTDOWN;
        randomDelay = random(1000, 5000);
        stateStartTime = now;
        roundCount++;
        Serial.print("Round ");
        Serial.print(roundCount);
        Serial.println(": Get ready...");
        delay(300);  // Debounce
      }
      break;

    case COUNTDOWN:
      // Waiting for random delay. Detect early presses.
      if (buttonState == LOW) {
        Serial.println("TOO EARLY! Wait for the LED.");
        Serial.println("Press button to try again.");
        Serial.println();
        roundCount--;  // Don't count this round
        currentState = WAITING;
        delay(300);
      }
      else if (now - stateStartTime >= randomDelay) {
        // Light the LED — player must react!
        digitalWrite(ledPin, HIGH);
        currentState = REACT;
        stateStartTime = now;
      }
      break;

    case REACT:
      // LED is on — measure reaction time
      if (buttonState == LOW) {
        reactionTime = now - stateStartTime;
        digitalWrite(ledPin, LOW);
        currentState = RESULT;
      }
      // Timeout after 3 seconds
      if (now - stateStartTime >= 3000) {
        Serial.println("Too slow! Timed out after 3 seconds.");
        Serial.println("Press button to try again.");
        Serial.println();
        digitalWrite(ledPin, LOW);
        currentState = WAITING;
      }
      break;

    case RESULT:
      // Display results
      Serial.print("Reaction time: ");
      Serial.print(reactionTime);
      Serial.println(" ms");

      // Rating
      if (reactionTime < 200) {
        Serial.println("Rating: INCREDIBLE!");
      } else if (reactionTime < 300) {
        Serial.println("Rating: Excellent!");
      } else if (reactionTime < 500) {
        Serial.println("Rating: Good");
      } else {
        Serial.println("Rating: Keep practicing");
      }

      // Best time tracking
      if (reactionTime < bestTime) {
        bestTime = reactionTime;
        Serial.println("*** NEW PERSONAL BEST! ***");
      }
      Serial.print("Best time so far: ");
      Serial.print(bestTime);
      Serial.println(" ms");
      Serial.println();
      Serial.println("Press button for next round.");
      Serial.println();

      currentState = WAITING;
      delay(500);
      break;
  }
}
