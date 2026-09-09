#include "DHT.h"
#include <Arduino.h>
#include <HTTPClient.h>
#include <WiFi.h>

// Sensor Pin Definitions for 4 Sectors
#define DHT1_PIN 15
#define MQ2_1_PIN 34

#define DHT2_PIN 13
#define MQ2_2_PIN 35

#define DHT3_PIN 14
#define MQ2_3_PIN 32

#define DHT4_PIN 27
#define MQ2_4_PIN 33

DHT dht1(DHT1_PIN, DHT22);
DHT dht2(DHT2_PIN, DHT22);
DHT dht3(DHT3_PIN, DHT22);
DHT dht4(DHT4_PIN, DHT22);

const char *ssid = "Wokwi-GUEST";
const char *password = "";

// TerraSentinel FastAPI public endpoint
const char *serverURL =
    "https://blocks-him-equal-univ.trycloudflare.com/sensor-data";

const int NUM_SECTORS = 4;
const char *nodeIDs[NUM_SECTORS] = {"node-1", "node-2", "node-3", "node-4"};
const char *sectorNames[NUM_SECTORS] = {"Alpha", "Bravo", "Charlie", "Delta"};
const int mqPins[NUM_SECTORS] = {MQ2_1_PIN, MQ2_2_PIN, MQ2_3_PIN, MQ2_4_PIN};
DHT *dhtSensors[NUM_SECTORS] = {&dht1, &dht2, &dht3, &dht4};

// Track last valid readings to handle transient DHT read delays
float lastTemp[NUM_SECTORS] = {24.0, 26.0, 32.0, 29.0};
float lastHum[NUM_SECTORS] = {45.0, 55.0, 38.0, 42.0};

void setup() {
  Serial.begin(115200);

  dht1.begin();
  dht2.begin();
  dht3.begin();
  dht4.begin();

  analogReadResolution(12);

  Serial.println("=========================================");
  Serial.println("   TerraSentinel Multi-Sector Hub");
  Serial.println("   Controlling 4 Live Wokwi Sectors");
  Serial.println("=========================================");

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

// Interval configuration (send every 5 seconds)
const unsigned long SEND_INTERVAL = 5000;
unsigned long lastSendTime = 0;

void loop() {
  unsigned long currentMillis = millis();

  // Trigger transmission every SEND_INTERVAL ms
  if (currentMillis - lastSendTime >= SEND_INTERVAL) {
    lastSendTime = currentMillis;

    Serial.println("-----------------------------------------");
    Serial.println("Sampling 4 Wokwi Environmental Sectors...");

    String jsonBatch = "[";

    for (int i = 0; i < NUM_SECTORS; i++) {
      float t = dhtSensors[i]->readTemperature();
      float h = dhtSensors[i]->readHumidity();
      int gasRaw = analogRead(mqPins[i]);

      if (!isnan(t) && !isnan(h)) {
        lastTemp[i] = t;
        lastHum[i] = h;
      }

      Serial.print("Sector ");
      Serial.print(sectorNames[i]);
      Serial.print(" -> Temp: ");
      Serial.print(lastTemp[i], 1);
      Serial.print("C | Humidity: ");
      Serial.print(lastHum[i], 1);
      Serial.print("% | Gas: ");
      Serial.println(gasRaw);

      if (i > 0) {
        jsonBatch += ",";
      }

      jsonBatch += "{";
      jsonBatch += "\"node_id\":\"" + String(nodeIDs[i]) + "\",";
      jsonBatch += "\"temperature\":" + String(lastTemp[i], 2) + ",";
      jsonBatch += "\"humidity\":" + String(lastHum[i], 2) + ",";
      jsonBatch += "\"gas\":" + String(gasRaw);
      jsonBatch += "}";
    }

    jsonBatch += "]";

    // Transmit batch payload to FastAPI
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;

      http.begin(serverURL);
      http.setTimeout(4000); // 4-second timeout
      http.setReuse(true);
      http.addHeader("Content-Type", "application/json");

      Serial.println("Broadcasting 4-sector telemetry to API...");
      int httpResponseCode = http.POST(jsonBatch);

      Serial.print("HTTP Response Code: ");
      Serial.println(httpResponseCode);

      if (httpResponseCode > 0) {
        String response = http.getString();
        Serial.println("API Response: " + response);
      } else {
        Serial.print("Error sending data: ");
        Serial.println(http.errorToString(httpResponseCode));
      }

      http.end();
    } else {
      Serial.println("WiFi disconnected! Reconnecting...");
      WiFi.reconnect();
    }
  }

  // Small delay to yield to ESP32 RTOS tasks and prevent watchdog triggers
  delay(50);
}