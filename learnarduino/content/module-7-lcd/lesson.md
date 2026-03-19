---
title: "LCD Display"
description: "Display text and variables on a 16x2 LCD using the LiquidCrystal library and I2C"
order: 7
tags: ["LCD", "LiquidCrystal", "I2C", "display"]
---

# Module 7: LCD Display

## What you'll learn

So far, the only way to see output from your Arduino is the Serial Monitor on your computer. An **LCD (Liquid Crystal Display)** lets your Arduino show information on its own screen — no computer needed. You'll display text, numbers, and live sensor data on a 16x2 character LCD.

## The 16x2 LCD

A 16x2 LCD has:
- **16 columns** — 16 characters per line
- **2 rows** — two lines of text
- A total of **32 characters** on screen at once

Characters are addressed by column (0-15) and row (0-1):

```
Column: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15
Row 0:  H  e  l  l  o     W  o  r  l  d  !
Row 1:  T  e  m  p  :     2  4  .  5  C
```

## I2C LCD (recommended)

The easiest way to connect an LCD is with an **I2C backpack** — a small board soldered to the back. It reduces the wiring from 12+ connections down to just 4:

| Wire | Connect to |
|------|-----------|
| GND  | GND       |
| VCC  | 5V        |
| SDA  | A4        |
| SCL  | A5        |

## The LiquidCrystal_I2C library

```cpp
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// Address is usually 0x27 or 0x3F — check your module
LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  lcd.init();       // Initialize the LCD
  lcd.backlight();  // Turn on the backlight

  lcd.setCursor(0, 0);     // Column 0, Row 0
  lcd.print("Hello!");

  lcd.setCursor(0, 1);     // Column 0, Row 1
  lcd.print("Arduino LCD");
}
```

## Key LCD functions

| Function | What it does |
|----------|-------------|
| `lcd.init()` | Initialize the LCD |
| `lcd.backlight()` | Turn on the backlight |
| `lcd.setCursor(col, row)` | Move cursor to position |
| `lcd.print(text)` | Print text or number at cursor |
| `lcd.clear()` | Clear all text and reset cursor |
| `lcd.noBacklight()` | Turn off the backlight |

## Displaying variables

You can print numbers and variables just like Serial:

```cpp
int temperature = 24;
lcd.setCursor(0, 0);
lcd.print("Temp: ");
lcd.print(temperature);
lcd.print("C");
```

## Updating the display

When displaying live data, you need to clear old text. Two approaches:

```cpp
// Approach 1: Clear and rewrite (causes flicker)
lcd.clear();
lcd.print(newValue);

// Approach 2: Overwrite with spaces (no flicker — preferred)
lcd.setCursor(0, 0);
lcd.print("Value:          ");  // Spaces clear old text
lcd.setCursor(7, 0);
lcd.print(newValue);
```

## Standard LiquidCrystal (without I2C)

If your LCD has no I2C backpack, use the standard `LiquidCrystal` library with direct pin connections:

```cpp
#include <LiquidCrystal.h>
LiquidCrystal lcd(12, 11, 5, 4, 3, 2);  // RS, E, D4, D5, D6, D7

void setup() {
  lcd.begin(16, 2);
  lcd.print("Hello!");
}
```

## Key concepts

- **16x2 LCD** — 16 characters, 2 rows
- **I2C** — a 2-wire communication protocol (SDA + SCL) that simplifies wiring
- **`lcd.setCursor(col, row)`** — position the cursor before printing
- **`lcd.print()`** — works like Serial.print but outputs to the LCD
- **`lcd.clear()`** — erases all text
- **Overwrite with spaces** — prevents screen flicker when updating values

## Challenge

Build a live dashboard that shows the potentiometer value on line 1 and a bar graph on line 2. The bar graph uses block characters to visually represent the pot position (0 blocks at 0, 16 blocks at max). Update the display without flicker.
