---
title: "Servo Control"
description: "Control a servo motor using the Servo library, sweep patterns, and potentiometer position mapping"
order: 6
tags: ["Servo", "library", "sweep", "map", "motor"]
---

# Module 6: Servo Control

## What you'll learn

A servo motor moves to a specific angle and holds its position. Unlike a regular motor that just spins, a servo can point to exactly 90 degrees and stay there. In this module you'll control a servo with code and with a potentiometer, learning about the Arduino **Servo library**.

## What is a servo?

A servo motor has three wires:
- **Red** — 5V power
- **Brown/Black** — GND
- **Orange/Yellow** — Signal (control wire)

Standard servos rotate from **0 to 180 degrees**. You send a signal telling it which angle to go to, and it moves there.

## The Servo library

Arduino has a built-in library for servos. A library is pre-written code that gives you new functions.

```cpp
#include <Servo.h>    // Include the library at the top

Servo myServo;        // Create a Servo object

void setup() {
  myServo.attach(9);  // Connect the servo signal wire to pin 9
}

void loop() {
  myServo.write(0);    // Go to 0 degrees
  delay(1000);
  myServo.write(90);   // Go to 90 degrees
  delay(1000);
  myServo.write(180);  // Go to 180 degrees
  delay(1000);
}
```

## Key Servo functions

| Function | What it does |
|----------|-------------|
| `myServo.attach(pin)` | Connect the servo to a pin |
| `myServo.write(angle)` | Move to an angle (0-180) |
| `myServo.read()` | Return the last angle written |
| `myServo.detach()` | Disconnect the servo from the pin |

## The classic sweep

The sweep moves the servo smoothly from 0 to 180 and back:

```cpp
void loop() {
  // Sweep from 0 to 180
  for (int angle = 0; angle <= 180; angle++) {
    myServo.write(angle);
    delay(15);  // Wait for the servo to reach the position
  }
  // Sweep from 180 to 0
  for (int angle = 180; angle >= 0; angle--) {
    myServo.write(angle);
    delay(15);
  }
}
```

## Potentiometer to servo mapping

This is where `map()` becomes powerful. Read the pot (0-1023), map it to servo angle (0-180):

```cpp
int potValue = analogRead(A0);
int angle = map(potValue, 0, 1023, 0, 180);
myServo.write(angle);
```

Now the servo physically mirrors the potentiometer position.

## Libraries explained

`#include <Servo.h>` is like importing a toolbox. Someone else wrote the complex code to generate the precise timing signals that servos need. You just call `write(angle)` and it handles the rest.

Many Arduino projects use libraries. You'll see more in later modules (LCD, sensors).

## Key concepts

- **Servo motor** — moves to a precise angle (0-180) and holds position
- **`#include <Servo.h>`** — include the Servo library
- **`Servo myServo`** — create a servo object
- **`.attach(pin)`** — assign a pin to the servo
- **`.write(angle)`** — move to a specific angle
- **`map()`** — convert potentiometer range to servo angle range

## Challenge

Build a potentiometer-controlled servo with serial feedback. Read the pot, map it to 0-180, move the servo, and print the angle. Add a feature: when the user types an angle (e.g., "45") in the Serial Monitor, the servo goes directly to that position, overriding the pot until the pot is moved again.
