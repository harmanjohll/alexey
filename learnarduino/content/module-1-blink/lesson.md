---
title: "Blink — Your First Arduino Program"
description: "Learn digitalWrite, pinMode, setup/loop, and delay by making an LED blink"
order: 1
tags: ["digital output", "basics"]
---

# Module 1: Blink

Welcome to your first Arduino program. By the end of this module, you'll understand the fundamental structure of every Arduino sketch and make an LED blink at exactly 1Hz.

## What You'll Learn

- The `setup()` and `loop()` functions — the skeleton of every Arduino program
- `pinMode()` — configuring a pin as input or output
- `digitalWrite()` — sending HIGH or LOW to a pin
- `delay()` — pausing execution for a specified number of milliseconds

## The Arduino Program Structure

Every Arduino program has exactly two required functions:

```cpp
void setup() {
  // Runs ONCE when the board powers on
}

void loop() {
  // Runs FOREVER, over and over
}
```

Think of `setup()` as your preparation step — you configure pins, initialize communication, set initial states. It runs exactly once.

`loop()` is where the action happens. After `setup()` finishes, `loop()` runs continuously, forever. When it reaches the end, it starts again from the top.

## Digital Output

Arduino pins can be in one of two states:
- **HIGH** — 5 volts (on)
- **LOW** — 0 volts (off)

Before you can use a pin for output, you must tell the Arduino what you intend to do with it:

```cpp
pinMode(13, OUTPUT);  // Pin 13 is now an output pin
```

Then you can control it:

```cpp
digitalWrite(13, HIGH);  // Turn pin 13 ON (5V)
digitalWrite(13, LOW);   // Turn pin 13 OFF (0V)
```

## The delay() Function

`delay(ms)` pauses your program for the specified number of milliseconds:
- `delay(1000)` = 1 second
- `delay(500)` = half a second
- `delay(100)` = one tenth of a second

> **Important:** While `delay()` is running, nothing else happens. The Arduino is completely frozen. This is fine for blinking an LED, but becomes a problem in more complex programs. We'll learn better approaches later.

## Pin 13 and LED_BUILTIN

Pin 13 is special — most Arduino boards have a built-in LED connected to it. You can use the constant `LED_BUILTIN` instead of the number 13. They're the same thing.

## Your Task

Write a program that:
1. Sets pin 13 as an output in `setup()`
2. In `loop()`, turns the LED on, waits 500ms, turns it off, waits 500ms

This creates a 1Hz blink — one full on/off cycle per second.

## Key Concepts

- **Digital signal**: Only two states — HIGH (5V) or LOW (0V). No in-between.
- **Hz (Hertz)**: Cycles per second. 1Hz = one complete cycle every second.
- **Duty cycle**: The fraction of time the signal is HIGH. A 500ms on / 500ms off blink has a 50% duty cycle.

## Think About This

Before you write your code, consider:
- What happens if you change the delay values? What if on-time ≠ off-time?
- Can you make the LED blink faster than your eye can see? At what frequency does it appear to stay on?
- Why do we need `pinMode()` at all — why can't we just start writing to pins?
