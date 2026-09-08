#include <Arduino.h>
#include <WiFi.h>
#include "DHT.h"

#define DHTPIN 15
#define DHTTYPE DHT22
#define MQ2_PIN 34

DHT dht(DHTPIN, DHTTYPE);

const char* ssid = "Wokwi-GUEST";
const char* password = "";


void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

Serial.print("Connecting to WiFi");

while (WiFi.status() != WL_CONNECTED) {
  delay(500);
  Serial.print(".");
}

Serial.println();
Serial.println("WiFi Connected!");
Serial.print("IP Address: ");
Serial.println(WiFi.localIP());
  dht.begin();
  analogReadResolution(12);

  Serial.println("================================");
  Serial.println("   TerraSentinel Sensor Node");
  Serial.println("================================");
}

void loop() {

  float temperature = dht.readTemperature();
  float humidity = dht.readHumidity();
  int gasRaw = analogRead(MQ2_PIN);

  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Sensor reading failed!");
    delay(2000);
    return;
  }

  // Simple prototype risk calculation
  int fireRisk = 0;
  int pollutionRisk = 0;

  // Fire risk
  if (temperature > 35) {
    fireRisk += 40;
  }

  if (humidity < 40) {
    fireRisk += 30;
  }

  if (gasRaw > 2000) {
    fireRisk += 30;
  }

  // Pollution risk
  if (gasRaw > 1500) {
    pollutionRisk += 50;
  }

  if (gasRaw > 2500) {
    pollutionRisk += 50;
  }

  if (fireRisk > 100) fireRisk = 100;
  if (pollutionRisk > 100) pollutionRisk = 100;

  // Display sensor data
  Serial.println("--------------------------------");

  Serial.print("Temperature : ");
  Serial.print(temperature);
  Serial.println(" C");

  Serial.print("Humidity    : ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.print("Gas Raw     : ");
  Serial.println(gasRaw);

  Serial.print("Fire Risk   : ");
  Serial.print(fireRisk);
  Serial.println(" %");

  Serial.print("Pollution Risk : ");
  Serial.print(pollutionRisk);
  Serial.println(" %");

  // Alert
  if (fireRisk >= 70 || pollutionRisk >= 70) {
    Serial.println("!!! ALERT: HIGH ENVIRONMENTAL RISK !!!");
  }
  else if (fireRisk >= 40 || pollutionRisk >= 40) {
    Serial.println("WARNING: Environmental risk detected.");
  }
  else {
    Serial.println("STATUS: Environment normal.");
  }

  delay(2000);
}