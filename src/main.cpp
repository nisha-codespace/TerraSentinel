#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include "DHT.h"

#define DHTPIN 15
#define DHTTYPE DHT22
#define MQ2_PIN 34

DHT dht(DHTPIN, DHTTYPE);

const char* ssid = "Wokwi-GUEST";
const char* password = "";

// TerraSentinel FastAPI public endpoint
const char* serverURL =
    "https://clara-crucial-baths-butter.trycloudflare.com/sensor-data";

void setup() {
  Serial.begin(115200);

  dht.begin();
  analogReadResolution(12);

  Serial.println("================================");
  Serial.println("   TerraSentinel Sensor Node");
  Serial.println("================================");

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

  Serial.println("--------------------------------");
  Serial.print("Temperature : ");
  Serial.print(temperature);
  Serial.println(" C");

  Serial.print("Humidity    : ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.print("Gas Raw     : ");
  Serial.println(gasRaw);

  // Send data to FastAPI
  if (WiFi.status() == WL_CONNECTED) {

    HTTPClient http;

    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");

    String jsonData = "{";
    jsonData += "\"temperature\":" + String(temperature, 2) + ",";
    jsonData += "\"humidity\":" + String(humidity, 2) + ",";
    jsonData += "\"gas\":" + String(gasRaw);
    jsonData += "}";

    Serial.println("Sending data to TerraSentinel API...");
    Serial.println(jsonData);

    int httpResponseCode = http.POST(jsonData);

    Serial.print("HTTP Response Code: ");
    Serial.println(httpResponseCode);

    if (httpResponseCode > 0) {

      String response = http.getString();

      Serial.println("API Response:");
      Serial.println(response);

    } else {

      Serial.print("Error sending data: ");
      Serial.println(http.errorToString(httpResponseCode));

    }

    http.end();

  } else {

    Serial.println("WiFi disconnected!");

  }

  delay(5000);
}