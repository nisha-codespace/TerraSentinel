void setup() {
  Serial.begin(115200);
  Serial.println("TerraSentinel ESP32 Started!");
}

void loop() {
  Serial.println("Environmental monitoring node is active...");
  delay(2000);
}