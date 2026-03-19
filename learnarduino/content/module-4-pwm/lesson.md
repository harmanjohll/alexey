---
title: "PWM & AnalogWrite"
description: "Fade an LED smoothly using Pulse Width Modulation and analogWrite"
order: 4
tags: ["PWM", "analogWrite", "duty cycle", "LED fade"]
---

# Module 4: PWM & AnalogWrite

## What you'll learn

Digital pins can only be HIGH (5V) or LOW (0V) — so how do you make an LED glow at half brightness? The answer is **PWM (Pulse Width Modulation)** — switching the pin on and off so fast that the LED *appears* to dim. In this module you'll fade an LED smoothly up and down.

## What is PWM?

PWM stands for **Pulse Width Modulation**. Instead of providing a steady voltage, the Arduino rapidly switches the pin between HIGH and LOW. The ratio of ON time to total time is called the **duty cycle**.

```
100% duty cycle:  ████████████████  (always on — full brightness)
 50% duty cycle:  ████    ████      (on half the time — half brightness)
 25% duty cycle:  ██      ██        (on quarter — dim)
  0% duty cycle:                    (always off)
```

Your eyes can't see the flickering because it happens at about 490 Hz (490 times per second). You just perceive a dimmer light.

## analogWrite()

Despite the name, `analogWrite()` is **not** truly analog — it outputs a PWM signal. It accepts values from **0 to 255**:

| Value | Duty Cycle | Brightness |
|-------|-----------|------------|
| 0     | 0%        | Off        |
| 64    | 25%       | Dim        |
| 127   | ~50%      | Medium     |
| 191   | 75%       | Bright     |
| 255   | 100%      | Full       |

```cpp
analogWrite(pin, 127);  // 50% brightness
```

**Important:** Only certain pins support PWM. On the Arduino Uno, these are pins **3, 5, 6, 9, 10, 11** — marked with a ~ on the board.

## A simple fade

```cpp
int ledPin = 9;  // Must be a PWM pin (~)

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  // Fade up
  for (int brightness = 0; brightness <= 255; brightness++) {
    analogWrite(ledPin, brightness);
    delay(5);
  }
  // Fade down
  for (int brightness = 255; brightness >= 0; brightness--) {
    analogWrite(ledPin, brightness);
    delay(5);
  }
}
```

## The for loop

A `for` loop repeats code a set number of times:

```cpp
for (int i = 0; i < 10; i++) {
  // This runs 10 times, with i = 0, 1, 2, ... 9
}
```

The three parts:
1. **Initialize:** `int i = 0` — starting value
2. **Condition:** `i < 10` — keep going while this is true
3. **Increment:** `i++` — add 1 after each loop

## Key concepts

- **PWM** — simulates analog output by switching on/off rapidly
- **Duty cycle** — percentage of time the signal is HIGH
- **`analogWrite(pin, value)`** — outputs PWM; value 0-255
- **PWM pins** — only pins marked with ~ support analogWrite (3, 5, 6, 9, 10, 11)
- **`for` loop** — repeats code with a counter variable
- **8-bit resolution** — 2^8 = 256 brightness levels (0-255)

## Challenge

Control LED brightness with a potentiometer. Read the pot with `analogRead()` (0-1023), convert it to the PWM range (0-255), and write it to the LED with `analogWrite()`. The LED brightness should follow the knob position smoothly. Print both the raw pot value and the mapped brightness to Serial.
