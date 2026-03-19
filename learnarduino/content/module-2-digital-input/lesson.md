---
title: "Digital Input"
description: "Read a pushbutton with digitalRead and make decisions with if/else"
order: 2
tags: ["digitalRead", "pushbutton", "if/else", "INPUT_PULLUP"]
---

# Module 2: Digital Input

## What you'll learn

In Module 1 you made an LED blink — that was **output**. Now you'll read **input** from the real world using a pushbutton. You'll learn how the Arduino detects whether a button is pressed or released, and how to make decisions in code using `if/else`.

## Digital signals

A digital pin can only be in one of two states:

| State | Voltage | Constant |
|-------|---------|----------|
| LOW   | 0V      | `LOW` or `0` |
| HIGH  | ~5V     | `HIGH` or `1` |

When you call `digitalRead(pin)`, the Arduino checks the voltage on that pin and returns either `HIGH` or `LOW`.

## The pushbutton circuit

A pushbutton has four legs. When pressed, it connects two sides together, completing the circuit. You'll wire it like this:

- One leg connects to **digital pin 2**
- The opposite leg connects to **GND**
- Use `INPUT_PULLUP` mode so the Arduino internally connects the pin to 5V through a resistor

With `INPUT_PULLUP`:
- Button **not pressed** → pin reads `HIGH` (pulled up to 5V)
- Button **pressed** → pin reads `LOW` (connected to GND)

This is inverted from what you might expect! The pull-up resistor prevents the pin from "floating" and reading random noise.

## Reading the button

```cpp
int buttonPin = 2;

void setup() {
  pinMode(buttonPin, INPUT_PULLUP);
  pinMode(13, OUTPUT);
}

void loop() {
  int buttonState = digitalRead(buttonPin);

  if (buttonState == LOW) {
    // Button IS pressed (LOW because of pull-up)
    digitalWrite(13, HIGH);
  } else {
    // Button is NOT pressed
    digitalWrite(13, LOW);
  }
}
```

## How if/else works

```cpp
if (condition) {
  // runs when condition is true
} else {
  // runs when condition is false
}
```

The condition is checked every time `loop()` repeats — hundreds of times per second. So the LED responds to the button almost instantly.

## Key concepts

- **`pinMode(pin, INPUT_PULLUP)`** — sets a pin as input with an internal pull-up resistor
- **`digitalRead(pin)`** — returns `HIGH` or `LOW`
- **`if/else`** — lets your program make decisions
- **Pull-up resistor** — keeps the pin at a known state (HIGH) when nothing is connected
- **Active LOW** — the button reads LOW when pressed, because it connects the pin to GND

## Challenge

Your task is to make an LED toggle on and off each time you press the button. Press once — LED stays on. Press again — LED turns off. This is harder than it sounds! You'll need to track the **previous** button state and detect the moment it changes.
