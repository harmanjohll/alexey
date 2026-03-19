/*
 * Module 8: Sensors — Combined Sensor Station (SOLUTION)
 *
 * Reads DHT11 (temp/humidity) and HC-SR04 (distance),
 * displays a dashboard, and triggers warnings.
 *
 * CIRCUIT:
 *   - DHT11: VCC → 5V, DATA → pin 2, GND → GND
 *   - HC-SR04: VCC → 5V, TRIG → pin 9, ECHO → pin 10, GND → GND
 *   - LED on pin 13 (warning indicator)
 */

#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

int trigPin = 9;
int echoPin = 10;
int ledPin = 13;

void setup() {
  Serial.begin(9600);
  dht.begin();

  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
  pinMode(ledPin, OUTPUT);

  Serial.println("=== Sensor Station ===");
  Serial.println();
}

void loop() {
  // --- DHT11 ---
  float humidity = dht.readHumidity();
  float tempC = dht.readTemperature();
  bool dhtOK = !isnan(humidity) && !isnan(tempC);

  // --- HC-SR04 ---
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  long duration = pulseIn(echoPin, HIGH);
  float distanceCm = duration * 0.0343 / 2;

  // --- Dashboard ---
  Serial.println("--- Sensor Reading ---");

  if (dhtOK) {
    Serial.print("Temp:     ");
    Serial.print(tempC);
    Serial.println(" C");
    Serial.print("Humidity: ");
    Serial.print(humidity);
    Serial.println(" %");
  } else {
    Serial.println("DHT: READ ERROR");
  }

  Serial.print("Distance: ");
  Serial.print(distanceCm);
  Serial.println(" cm");

  // --- Warnings ---
  bool warning = false;

  if (distanceCm < 10 && distanceCm > 0) {
    Serial.println(">>> OBJECT CLOSE! <<<");
    warning = true;
  }

  if (dhtOK && tempC > 30) {
    Serial.println(">>> TEMP HIGH! <<<");
    warning = true;
  }

  digitalWrite(ledPin, warning ? HIGH : LOW);

  Serial.println();
  delay(2000);
}
