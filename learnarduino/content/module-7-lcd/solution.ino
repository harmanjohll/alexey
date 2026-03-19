/*
 * Module 7: LCD Display — Live Potentiometer Dashboard (SOLUTION)
 *
 * Displays potentiometer value and bar graph on a 16x2 I2C LCD.
 *
 * CIRCUIT:
 *   - I2C LCD: SDA → A4, SCL → A5, VCC → 5V, GND → GND
 *   - Potentiometer: left → 5V, middle → A0, right → GND
 */

#include <Wire.h>
#include <LiquidCrystal_I2C.h>

LiquidCrystal_I2C lcd(0x27, 16, 2);

int potPin = A0;

void setup() {
  Serial.begin(9600);

  lcd.init();
  lcd.backlight();

  // Startup splash screen
  lcd.setCursor(0, 0);
  lcd.print("Pot Dashboard");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  delay(2000);
  lcd.clear();
}

void loop() {
  int potValue = analogRead(potPin);
  int percent = map(potValue, 0, 1023, 0, 100);

  // Line 1: Show value and percentage
  lcd.setCursor(0, 0);
  lcd.print("Val:");
  lcd.print(potValue);
  lcd.print(" (");
  lcd.print(percent);
  lcd.print("%)   ");  // Trailing spaces clear leftover digits

  // Line 2: Bar graph
  int blocks = map(potValue, 0, 1023, 0, 16);
  lcd.setCursor(0, 1);
  for (int i = 0; i < 16; i++) {
    if (i < blocks) {
      lcd.write(0xFF);  // Full block character
    } else {
      lcd.print(" ");
    }
  }

  // Debug output
  Serial.print("Pot: ");
  Serial.print(potValue);
  Serial.print(" | ");
  Serial.print(percent);
  Serial.println("%");

  delay(100);
}
