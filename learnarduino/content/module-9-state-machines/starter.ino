/*
 * Module 9: State Machines — Traffic Light with Pedestrian Crossing
 *
 * GOAL: Build a traffic light using a state machine.
 *       - GREEN for 5 seconds, YELLOW for 2 seconds, RED for 5 seconds
 *       - A pushbutton triggers a pedestrian crossing request
 *       - When pressed during GREEN, transition early to YELLOW → RED
 *       - Print state changes to Serial
 *
 * CIRCUIT:
 *   - Green LED  → pin 4
 *   - Yellow LED → pin 3
 *   - Red LED    → pin 2
 *   - Pushbutton → pin 7 (with INPUT_PULLUP)
 */

int greenPin = 4;
int yellowPin = 3;
int redPin = 2;
int buttonPin = 7;

// TODO 1: Define the states using an enum
//         States: GREEN, YELLOW, RED, PED_WAIT (pedestrian red phase)
// enum TrafficState {
//   GREEN,
//   YELLOW,
//   RED,
//   PED_WAIT
// };


// TODO 2: Create variables for current state and timing
// TrafficState currentState = GREEN;
// unsigned long stateStartTime = 0;
// bool pedRequested = false;

// Duration for each state (milliseconds)
const unsigned long GREEN_TIME  = 5000;
const unsigned long YELLOW_TIME = 2000;
const unsigned long RED_TIME    = 5000;
const unsigned long PED_TIME    = 5000;

void setup() {
  Serial.begin(9600);

  // TODO 3: Set LED pins as OUTPUT and button as INPUT_PULLUP
  // pinMode(greenPin, OUTPUT);
  // pinMode(yellowPin, OUTPUT);
  // pinMode(redPin, OUTPUT);
  // pinMode(buttonPin, INPUT_PULLUP);


  // TODO 4: Start in GREEN state — turn on green LED
  // setLights(HIGH, LOW, LOW);  // green, yellow, red
  // Serial.println("STATE: GREEN");
}

// Helper function to set all three LEDs at once
void setLights(int green, int yellow, int red) {
  digitalWrite(greenPin, green);
  digitalWrite(yellowPin, yellow);
  digitalWrite(redPin, red);
}

void loop() {
  unsigned long now = millis();

  // TODO 5: Check for pedestrian button press
  //         If pressed during GREEN, set pedRequested = true
  // if (digitalRead(buttonPin) == LOW && currentState == GREEN) {
  //   pedRequested = true;
  //   Serial.println("Pedestrian crossing requested!");
  // }


  // TODO 6: Implement the state machine using switch/case
  // switch (currentState) {
  //
  //   case GREEN:
  //     // Transition to YELLOW if time expired OR pedestrian requested
  //     if (now - stateStartTime >= GREEN_TIME || pedRequested) {
  //       currentState = pedRequested ? YELLOW : YELLOW;
  //       setLights(LOW, HIGH, LOW);
  //       stateStartTime = now;
  //       Serial.println("STATE: YELLOW");
  //     }
  //     break;
  //
  //   case YELLOW:
  //     // TODO 7: After YELLOW_TIME, go to RED (or PED_WAIT if requested)
  //     if (now - stateStartTime >= YELLOW_TIME) {
  //       if (pedRequested) {
  //         currentState = PED_WAIT;
  //         Serial.println("STATE: PED_WAIT (crossing safe)");
  //       } else {
  //         currentState = RED;
  //         Serial.println("STATE: RED");
  //       }
  //       setLights(LOW, LOW, HIGH);
  //       stateStartTime = now;
  //     }
  //     break;
  //
  //   case RED:
  //     // TODO 8: After RED_TIME, return to GREEN
  //     if (now - stateStartTime >= RED_TIME) {
  //       currentState = GREEN;
  //       setLights(HIGH, LOW, LOW);
  //       stateStartTime = now;
  //       Serial.println("STATE: GREEN");
  //     }
  //     break;
  //
  //   case PED_WAIT:
  //     // TODO 9: After PED_TIME, clear the request and return to GREEN
  //     if (now - stateStartTime >= PED_TIME) {
  //       pedRequested = false;
  //       currentState = GREEN;
  //       setLights(HIGH, LOW, LOW);
  //       stateStartTime = now;
  //       Serial.println("Pedestrian crossing complete.");
  //       Serial.println("STATE: GREEN");
  //     }
  //     break;
  // }

  delay(10);  // Small delay for button debouncing
}
