/*
 * Module 7: LCD Display — Live Potentiometer Dashboard
 *
 * GOAL: Display potentiometer value on line 1 and a bar graph on line 2.
 *       The bar graph fills with block characters based on pot position.
 *       Update without flicker.
 *
 * CIRCUIT:
 *   - I2C LCD: SDA → A4, SCL → A5, VCC → 5V, GND → GND
 *   - Potentiometer: left → 5V, middle → A0, right → GND
 *
 * NOTE: If your LCD has address 0x3F instead of 0x27, change it below.
 */

// TODO 1: Include the required libraries
// #include <Wire.h>
// #include <LiquidCrystal_I2C.h>

// TODO 2: Create the LCD object (address, columns, rows)
// LiquidCrystal_I2C lcd(0x27, 16, 2);

int potPin = A0;

void setup() {
  Serial.begin(9600);

  // TODO 3: Initialize the LCD and turn on the backlight
  // lcd.init();
  // lcd.backlight();


  // TODO 4: Display a startup message for 2 seconds
  // lcd.setCursor(0, 0);
  // lcd.print("Pot Dashboard");
  // lcd.setCursor(0, 1);
  // lcd.print("Starting...");
  // delay(2000);
  // lcd.clear();

}

void loop() {
  // TODO 5: Read the potentiometer
  // int potValue = analogRead(potPin);


  // TODO 6: Map the value to percentage (0-100) for display
  // int percent = map(potValue, 0, 1023, 0, 100);


  // TODO 7: Display "Value: XXX (YY%)" on line 1
  //         Use setCursor to overwrite instead of clear()
  // lcd.setCursor(0, 0);
  // lcd.print("Val:");
  // lcd.print(potValue);
  // lcd.print(" (");
  // lcd.print(percent);
  // lcd.print("%)   ");  // trailing spaces clear old digits


  // TODO 8: Create the bar graph on line 2
  //         Map potValue to number of blocks (0-16)
  // int blocks = map(potValue, 0, 1023, 0, 16);
  // lcd.setCursor(0, 1);
  // for (int i = 0; i < 16; i++) {
  //   if (i < blocks) {
  //     lcd.write(0xFF);  // Full block character
  //   } else {
  //     lcd.print(" ");   // Empty space
  //   }
  // }


  // Also print to Serial for debugging
  // Serial.print("Pot: ");
  // Serial.print(potValue);
  // Serial.print(" | ");
  // Serial.print(percent);
  // Serial.println("%");

  delay(100);
}
