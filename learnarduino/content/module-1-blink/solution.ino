// Module 1: Blink — Solution
// This file is SERVER-SIDE ONLY — never sent to the client

void setup() {
  pinMode(13, OUTPUT);
}

void loop() {
  digitalWrite(13, HIGH);
  delay(500);
  digitalWrite(13, LOW);
  delay(500);
}
