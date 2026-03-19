---
title: "Sensors"
description: "Read temperature and humidity from a DHT11 sensor and measure distance with an HC-SR04 ultrasonic sensor"
order: 8
tags: ["DHT11", "HC-SR04", "temperature", "ultrasonic", "sensors"]
---

# Module 8: Sensors

## What you'll learn

Until now you've used buttons and potentiometers for input. Now you'll connect **real sensors** that measure the physical world — temperature, humidity, and distance. You'll learn how each sensor works and how to interpret the data it returns.

## Part A: DHT11 — Temperature & Humidity

The DHT11 is a simple, inexpensive sensor that measures:
- **Temperature:** 0-50 C (accuracy +/- 2 C)
- **Humidity:** 20-80% (accuracy +/- 5%)

### Wiring (3-pin module)

| DHT11 Pin | Arduino |
|-----------|---------|
| VCC (+)   | 5V      |
| DATA (S)  | Pin 2   |
| GND (-)   | GND     |

Some modules have a built-in pull-up resistor. If yours doesn't, add a 10K resistor between DATA and VCC.

### Using the DHT library

```cpp
#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  float humidity = dht.readHumidity();
  float tempC = dht.readTemperature();       // Celsius
  float tempF = dht.readTemperature(true);   // Fahrenheit

  // Check if reading failed
  if (isnan(humidity) || isnan(tempC)) {
    Serial.println("Failed to read from DHT sensor!");
    return;
  }

  Serial.print("Temp: ");
  Serial.print(tempC);
  Serial.print(" C  |  Humidity: ");
  Serial.print(humidity);
  Serial.println("%");

  delay(2000);  // DHT11 needs at least 1 second between reads
}
```

### What is `isnan()`?

`isnan()` means "is Not A Number". If the sensor fails to respond, the DHT library returns `NaN` instead of a number. Checking for this prevents your code from using garbage data.

## Part B: HC-SR04 — Ultrasonic Distance Sensor

The HC-SR04 measures distance using **sound waves** — like a bat's echolocation. It sends an ultrasonic pulse and measures how long it takes to bounce back.

### How it works

1. Arduino sends a 10-microsecond pulse on the TRIG pin
2. The sensor emits an ultrasonic burst (40 kHz — inaudible)
3. The burst bounces off an object and returns
4. The sensor reports the round-trip time on the ECHO pin
5. Distance = (time x speed of sound) / 2

Speed of sound = 343 m/s = 0.0343 cm/microsecond

### Wiring

| HC-SR04 Pin | Arduino |
|-------------|---------|
| VCC         | 5V      |
| TRIG        | Pin 9   |
| ECHO        | Pin 10  |
| GND         | GND     |

### Code

```cpp
int trigPin = 9;
int echoPin = 10;

void setup() {
  Serial.begin(9600);
  pinMode(trigPin, OUTPUT);
  pinMode(echoPin, INPUT);
}

void loop() {
  // Send a 10-microsecond pulse
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);

  // Read the echo time in microseconds
  long duration = pulseIn(echoPin, HIGH);

  // Calculate distance in centimeters
  float distanceCm = duration * 0.0343 / 2;

  Serial.print("Distance: ");
  Serial.print(distanceCm);
  Serial.println(" cm");

  delay(100);
}
```

### Understanding `pulseIn()`

`pulseIn(pin, HIGH)` waits for the pin to go HIGH, then measures how many microseconds it stays HIGH before going LOW. This gives you the round-trip time of the sound wave.

We divide by 2 because the sound travels to the object AND back — the distance is only half the total path.

## Key concepts

- **DHT11** — measures temperature and humidity using a digital protocol
- **`isnan()`** — checks if a reading failed (Not A Number)
- **HC-SR04** — measures distance using ultrasonic sound waves
- **`pulseIn()`** — measures the duration of a HIGH or LOW pulse in microseconds
- **Speed of sound** — 343 m/s or 0.0343 cm/microsecond
- **Divide by 2** — sound travels to the object and back
- **Libraries** — DHT library handles the complex timing protocol

## Challenge

Build a combined sensor station. Read temperature and humidity from the DHT11, and distance from the HC-SR04. Print all values to Serial. Add a warning: if distance is less than 10 cm, print "OBJECT CLOSE!" and if temperature exceeds 30 C, print "TEMP HIGH!".
