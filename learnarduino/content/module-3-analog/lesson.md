---
title: "Analog Input"
description: "Read analog values from a potentiometer with analogRead and display them over Serial"
order: 3
tags: ["analogRead", "potentiometer", "Serial", "ADC"]
---

# Module 3: Analog Input

## What you'll learn

Digital pins only know HIGH or LOW — on or off. But the real world isn't binary. Temperature, light, rotation — these things vary smoothly. In this module you'll read **analog** values from a potentiometer (a dial) and display them using the Serial Monitor.

## Digital vs Analog

| Digital | Analog |
|---------|--------|
| Two states: HIGH or LOW | A range of values |
| 0V or 5V | 0V to 5V continuously |
| `digitalRead()` → 0 or 1 | `analogRead()` → 0 to 1023 |

## The ADC (Analog-to-Digital Converter)

The Arduino Uno has a 10-bit ADC. This means it converts a voltage (0V to 5V) into a number from **0 to 1023**:

- 0V → 0
- 2.5V → ~512
- 5V → 1023

The formula: `value = (voltage / 5.0) * 1023`

The Arduino has 6 analog input pins labelled **A0** through **A5**.

## The potentiometer

A potentiometer (pot) is a variable resistor with three pins:

1. **Left pin** → connect to 5V
2. **Middle pin (wiper)** → connect to analog input (A0)
3. **Right pin** → connect to GND

Turning the knob moves the wiper, changing the voltage at the middle pin from 0V to 5V.

## Serial Monitor — your debugging window

The Serial Monitor lets your Arduino send text back to your computer. This is how you see what's happening inside your code.

```cpp
void setup() {
  Serial.begin(9600);  // Start serial communication at 9600 baud
}

void loop() {
  int sensorValue = analogRead(A0);
  Serial.println(sensorValue);  // Print value and go to next line
  delay(100);
}
```

### Serial functions

| Function | What it does |
|----------|-------------|
| `Serial.begin(9600)` | Start serial at 9600 bits per second |
| `Serial.print(x)` | Print x, stay on the same line |
| `Serial.println(x)` | Print x, then go to the next line |

## Mapping values

The `map()` function converts a number from one range to another:

```cpp
int potValue = analogRead(A0);           // 0-1023
int angle = map(potValue, 0, 1023, 0, 180);  // Convert to 0-180
```

This is useful when you want to convert a raw sensor reading into something meaningful — like degrees, percentage, or LED brightness.

## Key concepts

- **`analogRead(pin)`** — reads analog voltage, returns 0-1023
- **Analog pins A0-A5** — special pins with ADC capability
- **10-bit resolution** — 2^10 = 1024 possible values
- **`Serial.begin()`** — starts serial communication
- **`Serial.println()`** — prints data to the Serial Monitor
- **`map(value, fromLow, fromHigh, toLow, toHigh)`** — scales a number from one range to another

## Challenge

Read the potentiometer and control the blink rate of an LED. When the pot is turned fully left, the LED blinks slowly (1 second). Turned fully right, it blinks fast (50ms). Print the delay value to the Serial Monitor.
