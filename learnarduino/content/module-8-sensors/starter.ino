/*
 * Module 8: Sensors — Combined Sensor Station
 *
 * GOAL: Read data from both sensors and print a formatted dashboard.
 *       Add warnings for close objects (< 10cm) and high temperature (> 30C).
 *
 * CIRCUIT:
 *   - DHT11: VCC → 5V, DATA → pin 2, GND → GND
 *   - HC-SR04: VCC → 5V, TRIG → pin 9, ECHO → pin 10, GND → GND
 *   - LED on pin 13 (warning indicator)
 */

// TODO 1: Include the DHT library
// #include <DHT.h>

// TODO 2: Define DHT pin and type, create DHT object
// #define DHTPIN 2
// #define DHTTYPE DHT11
// DHT dht(DHTPIN, DHTTYPE);

int trigPin = 9;
int echoPin = 10;
int ledPin = 13;

void setup() {
  Serial.begin(9600);

  // TODO 3: Initialize the DHT sensor
  // dht.begin();

  // TODO 4: Set pin modes for ultrasonic sensor and LED
  // pinMode(trigPin, OUTPUT);
  // pinMode(echoPin, INPUT);
  // pinMode(ledPin, OUTPUT);

  Serial.println("=== Sensor Station ===");
  Serial.println();
}

void loop() {
  // --- DHT11: Temperature & Humidity ---

  // TODO 5: Read humidity and temperature
  // float humidity = dht.readHumidity();
  // float tempC = dht.readTemperature();


  // TODO 6: Check if DHT readings are valid
  // bool dhtOK = !isnan(humidity) && !isnan(tempC);


  // --- HC-SR04: Distance ---

  // TODO 7: Send a 10-microsecond trigger pulse
  // digitalWrite(trigPin, LOW);
  // delayMicroseconds(2);
  // digitalWrite(trigPin, HIGH);
  // delayMicroseconds(10);
  // digitalWrite(trigPin, LOW);


  // TODO 8: Read the echo duration and calculate distance
  // long duration = pulseIn(echoPin, HIGH);
  // float distanceCm = duration * 0.0343 / 2;


  // --- Display Dashboard ---

  // TODO 9: Print a formatted dashboard to Serial
  // Serial.println("--- Sensor Reading ---");
  //
  // if (dhtOK) {
  //   Serial.print("Temp:     ");
  //   Serial.print(tempC);
  //   Serial.println(" C");
  //   Serial.print("Humidity: ");
  //   Serial.print(humidity);
  //   Serial.println(" %");
  // } else {
  //   Serial.println("DHT: READ ERROR");
  // }
  //
  // Serial.print("Distance: ");
  // Serial.print(distanceCm);
  // Serial.println(" cm");


  // --- Warnings ---

  // TODO 10: Check for warnings and turn on LED if any warning is active
  // bool warning = false;
  //
  // if (distanceCm < 10 && distanceCm > 0) {
  //   Serial.println(">>> OBJECT CLOSE! <<<");
  //   warning = true;
  // }
  //
  // if (dhtOK && tempC > 30) {
  //   Serial.println(">>> TEMP HIGH! <<<");
  //   warning = true;
  // }
  //
  // digitalWrite(ledPin, warning ? HIGH : LOW);

  // Serial.println();

  delay(2000);  // DHT11 needs at least 1s between reads
}
