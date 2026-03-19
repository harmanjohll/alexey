---
title: "State Machines"
description: "Build a traffic light controller using enum states, timed transitions, and structured program flow"
order: 9
tags: ["state machine", "enum", "traffic light", "millis", "program design"]
---

# Module 9: State Machines

## What you'll learn

As your programs get more complex, you need a better way to organize them than just if/else chains. A **state machine** is a design pattern where your program is always in one specific **state**, and it transitions between states based on rules. You'll build a traffic light controller to learn this powerful concept.

## What is a state machine?

Think of a traffic light. At any moment, it's in one of these states:

1. **GREEN** — go (lasts 5 seconds)
2. **YELLOW** — slow down (lasts 2 seconds)
3. **RED** — stop (lasts 5 seconds)

The light is always in exactly ONE state. It transitions to the next state after a timer expires. This is a state machine.

```
GREEN → (5s) → YELLOW → (2s) → RED → (5s) → GREEN → ...
```

## Using `enum` to define states

An `enum` (enumeration) creates named constants for your states:

```cpp
enum TrafficState {
  GREEN,
  YELLOW,
  RED
};

TrafficState currentState = GREEN;
```

This is much clearer than using numbers (0, 1, 2). When you read `currentState == GREEN`, you know exactly what it means.

## Using `millis()` instead of `delay()`

`delay()` freezes your entire program. Nothing else can happen during a delay. For a state machine, we use `millis()` instead — it returns how many milliseconds have passed since the Arduino started.

```cpp
unsigned long stateStartTime = 0;

// Check if enough time has passed
if (millis() - stateStartTime >= 5000) {
  // 5 seconds have elapsed — time to transition!
  stateStartTime = millis();  // Reset the timer
}
```

### Why `unsigned long`?

`millis()` returns an `unsigned long` — a large positive number. A regular `int` can only hold values up to 32,767, but millis() keeps counting up to about 4.3 billion (roughly 50 days of runtime).

## The state machine pattern

```cpp
enum TrafficState { GREEN, YELLOW, RED };

TrafficState currentState = GREEN;
unsigned long stateStartTime = 0;

void loop() {
  unsigned long now = millis();

  switch (currentState) {
    case GREEN:
      // Do green things (green LED on)
      if (now - stateStartTime >= 5000) {
        currentState = YELLOW;
        stateStartTime = now;
      }
      break;

    case YELLOW:
      // Do yellow things
      if (now - stateStartTime >= 2000) {
        currentState = RED;
        stateStartTime = now;
      }
      break;

    case RED:
      // Do red things
      if (now - stateStartTime >= 5000) {
        currentState = GREEN;
        stateStartTime = now;
      }
      break;
  }
}
```

## The `switch` statement

`switch` is cleaner than long if/else chains:

```cpp
switch (variable) {
  case VALUE_1:
    // code for value 1
    break;       // Don't forget break!
  case VALUE_2:
    // code for value 2
    break;
  default:
    // code if no case matches
    break;
}
```

**Important:** If you forget `break`, the code "falls through" to the next case.

## Why state machines matter

State machines appear everywhere in engineering:
- Traffic lights
- Vending machines (idle → coin inserted → item selected → dispensing)
- Video game character behavior (idle → walking → jumping → falling)
- Washing machines (fill → wash → rinse → spin → done)
- Network protocols

They keep complex programs organized and predictable.

## Key concepts

- **State** — the current mode or situation your program is in
- **Transition** — moving from one state to another based on a condition
- **`enum`** — defines named states (clearer than magic numbers)
- **`switch/case`** — checks which state you're in and runs the right code
- **`millis()`** — returns time since startup; allows non-blocking timing
- **`unsigned long`** — data type for large positive numbers (needed for millis)
- **Non-blocking** — using millis() instead of delay() so other code can still run

## Challenge

Build a traffic light with three LEDs (red, yellow, green). Use a state machine with `millis()` for timing. Add a pushbutton for a pedestrian crossing: when pressed during GREEN, the light should transition through YELLOW to RED, wait 5 seconds, then return to GREEN. Print state changes to Serial.
