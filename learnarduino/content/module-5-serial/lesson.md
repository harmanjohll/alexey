---
title: "Serial Communication"
description: "Use the Serial Monitor for debugging, sending data, and receiving commands with Serial.read"
order: 5
tags: ["Serial", "debugging", "Serial.read", "communication"]
---

# Module 5: Serial Communication

## What you'll learn

You've used `Serial.println()` to print values. Now you'll use Serial as a **two-way communication channel** — sending commands FROM your computer TO the Arduino. You'll learn to read incoming characters, parse simple commands, and build a text-controlled LED system.

## Serial is two-way

Serial communication has two lines:
- **TX (transmit)** — Arduino sends data to your computer (`Serial.print`)
- **RX (receive)** — your computer sends data to Arduino (`Serial.read`)

When you type in the Serial Monitor and press Enter, those characters travel down the USB cable to the Arduino.

## Reading serial data

```cpp
void loop() {
  if (Serial.available() > 0) {
    char incoming = Serial.read();
    Serial.print("Received: ");
    Serial.println(incoming);
  }
}
```

### Key functions

| Function | What it does |
|----------|-------------|
| `Serial.available()` | Returns how many bytes are waiting to be read |
| `Serial.read()` | Reads and returns the next byte (as an int) |
| `Serial.readString()` | Reads all available characters as a String |
| `Serial.parseInt()` | Reads characters and converts to an integer |

## Characters vs numbers

When you type "5" in the Serial Monitor, the Arduino receives the **character** '5', which has an ASCII value of 53 — not the number 5.

```cpp
char c = Serial.read();   // c = '5' (ASCII 53)
int n = c - '0';          // n = 5 (the actual number)
```

The trick `c - '0'` converts a digit character to its numeric value because ASCII digits are sequential: '0'=48, '1'=49, '2'=50, etc.

## Building a command system

You can control your Arduino by typing commands:

```cpp
void loop() {
  if (Serial.available() > 0) {
    char command = Serial.read();

    if (command == '1') {
      digitalWrite(13, HIGH);
      Serial.println("LED ON");
    }
    else if (command == '0') {
      digitalWrite(13, LOW);
      Serial.println("LED OFF");
    }
    else {
      Serial.print("Unknown command: ");
      Serial.println(command);
    }
  }
}
```

## Formatting output

Good serial output makes debugging much easier:

```cpp
// Bad — hard to read
Serial.println(sensorValue);

// Good — labelled and clear
Serial.print("Sensor A0: ");
Serial.print(sensorValue);
Serial.print(" | Mapped: ");
Serial.println(mappedValue);
```

## String comparison

For longer commands, use `Serial.readString()`:

```cpp
if (Serial.available() > 0) {
  String cmd = Serial.readString();
  cmd.trim();  // Remove whitespace and newline

  if (cmd == "status") {
    Serial.println("System OK");
  }
}
```

## Key concepts

- **`Serial.available()`** — check if data is waiting
- **`Serial.read()`** — read one byte at a time
- **`Serial.readString()`** — read all available text as a String
- **ASCII** — characters are stored as numbers ('A'=65, '0'=48)
- **`c - '0'`** — convert a digit character to its number
- **Two-way communication** — TX (Arduino → PC) and RX (PC → Arduino)

## Challenge

Build a serial-controlled RGB brightness system. The user types a number 0-9 in the Serial Monitor. The Arduino maps it to LED brightness (0=off, 9=full) and applies it with `analogWrite()`. Print confirmation: "Brightness set to: 5 (PWM: 141)". Handle invalid input with an error message.
