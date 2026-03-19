/*
 * Module 9: State Machines — Traffic Light with Pedestrian Crossing (SOLUTION)
 *
 * A traffic light state machine with pedestrian crossing button.
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

enum TrafficState {
  GREEN,
  YELLOW,
  RED,
  PED_WAIT
};

TrafficState currentState = GREEN;
unsigned long stateStartTime = 0;
bool pedRequested = false;

const unsigned long GREEN_TIME  = 5000;
const unsigned long YELLOW_TIME = 2000;
const unsigned long RED_TIME    = 5000;
const unsigned long PED_TIME    = 5000;

void setup() {
  Serial.begin(9600);

  pinMode(greenPin, OUTPUT);
  pinMode(yellowPin, OUTPUT);
  pinMode(redPin, OUTPUT);
  pinMode(buttonPin, INPUT_PULLUP);

  setLights(HIGH, LOW, LOW);
  stateStartTime = millis();
  Serial.println("=== Traffic Light Controller ===");
  Serial.println("STATE: GREEN");
}

void setLights(int green, int yellow, int red) {
  digitalWrite(greenPin, green);
  digitalWrite(yellowPin, yellow);
  digitalWrite(redPin, red);
}

void loop() {
  unsigned long now = millis();

  // Check for pedestrian button press during GREEN
  if (digitalRead(buttonPin) == LOW && currentState == GREEN) {
    if (!pedRequested) {
      pedRequested = true;
      Serial.println("Pedestrian crossing requested!");
    }
  }

  switch (currentState) {

    case GREEN:
      if (now - stateStartTime >= GREEN_TIME || pedRequested) {
        currentState = YELLOW;
        setLights(LOW, HIGH, LOW);
        stateStartTime = now;
        Serial.println("STATE: YELLOW");
      }
      break;

    case YELLOW:
      if (now - stateStartTime >= YELLOW_TIME) {
        if (pedRequested) {
          currentState = PED_WAIT;
          Serial.println("STATE: PED_WAIT (crossing safe)");
        } else {
          currentState = RED;
          Serial.println("STATE: RED");
        }
        setLights(LOW, LOW, HIGH);
        stateStartTime = now;
      }
      break;

    case RED:
      if (now - stateStartTime >= RED_TIME) {
        currentState = GREEN;
        setLights(HIGH, LOW, LOW);
        stateStartTime = now;
        Serial.println("STATE: GREEN");
      }
      break;

    case PED_WAIT:
      if (now - stateStartTime >= PED_TIME) {
        pedRequested = false;
        currentState = GREEN;
        setLights(HIGH, LOW, LOW);
        stateStartTime = now;
        Serial.println("Pedestrian crossing complete.");
        Serial.println("STATE: GREEN");
      }
      break;
  }

  delay(10);
}
