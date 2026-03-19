---
title: "Final Project"
description: "Design and build your own Arduino project combining skills from all previous modules"
order: 10
tags: ["project", "design", "integration", "portfolio"]
---

# Module 10: Final Project

## What you'll learn

This is your capstone project. You'll design, plan, and build an Arduino project of your own choosing. There's no single right answer — the goal is to combine skills from previous modules into something that solves a real problem or creates something interesting.

## Project requirements

Your final project must incorporate at least **three concepts** from previous modules:

| Module | Concept |
|--------|---------|
| 1 | Digital output (LEDs, digitalWrite) |
| 2 | Digital input (buttons, digitalRead) |
| 3 | Analog input (analogRead, sensors) |
| 4 | PWM output (analogWrite, fading) |
| 5 | Serial communication (monitoring, commands) |
| 6 | Servo motors (controlled movement) |
| 7 | LCD display (visual output) |
| 8 | Sensors (temperature, distance, etc.) |
| 9 | State machines (structured program flow) |

## Project ideas

Here are some starting points. You can use one of these or design your own:

### 1. Smart Room Monitor
Combine: DHT11 + ultrasonic + LCD + state machine
- Display temperature and humidity on LCD
- Detect when someone enters the room (ultrasonic)
- Switch between display modes with a button
- Warning LED if temperature is too high

### 2. Automated Plant Waterer
Combine: soil moisture sensor + servo + LCD + Serial
- Read soil moisture (analog input)
- Display moisture level on LCD
- When too dry, activate a servo to open a water valve
- Log all events over Serial

### 3. Reaction Time Game
Combine: LEDs + button + LCD + millis() + state machine
- Random LED lights up after a random delay
- Player presses button as fast as possible
- LCD shows reaction time in milliseconds
- Track best score across rounds

### 4. Distance-Based Theremin
Combine: ultrasonic sensor + buzzer (PWM) + LCD
- Use hand distance to control pitch of a buzzer
- Map distance to frequency with analogWrite
- Display the current note/frequency on LCD
- Add a button to change octaves

### 5. Security System
Combine: ultrasonic + servo + LEDs + buzzer + state machine
- States: ARMED, TRIGGERED, ALARM, DISARMED
- Ultrasonic detects intruder (distance < threshold)
- Warning period with flashing yellow LED
- Alarm with red LED and buzzer
- Serial command or button sequence to disarm

## Project planning template

Before you start coding, answer these questions:

1. **What does your project do?** (1-2 sentences)
2. **What components do you need?** (list them)
3. **What modules does it use?** (at least 3)
4. **What are the states?** (if using a state machine)
5. **What are the inputs and outputs?**
6. **Draw a simple wiring diagram** (paper sketch is fine)

## Best practices for your project

### Code organization
- Use clear variable names (`temperaturePin` not `tp`)
- Group related code into functions
- Add comments explaining WHY, not just WHAT
- Use `#define` or `const` for pin numbers

### Debugging strategy
- Add Serial.println() statements during development
- Test each component individually before combining
- Build incrementally — get one feature working before adding the next

### Common pitfalls
- Forgetting to set `pinMode()` for every pin
- Using delay() when you need millis() for multitasking
- Not debouncing buttons
- Using a non-PWM pin for analogWrite()
- Forgetting `break` in switch/case

## Submission checklist

- [ ] Project uses at least 3 concepts from previous modules
- [ ] Code compiles without errors
- [ ] Code has clear comments
- [ ] Variable names are descriptive
- [ ] Serial Monitor shows useful debug information
- [ ] You can explain how every part of your code works

## Challenge

Build your chosen project. Start with a plan, build one component at a time, test each piece, then combine them. Document your process — what worked, what didn't, and what you learned. The best projects aren't the most complex — they're the ones you understand completely.
