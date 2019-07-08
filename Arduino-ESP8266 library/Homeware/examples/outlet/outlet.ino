#include <homeware.h>
#include <ArduinoJson.h>
#include <EEPROM.h>


//Config this section
const char* ssid = "your-wifi-ssid";
const char* password = "your-wifi-password";
char* host = "us-central1-[id].cloudfunctions.net";
char* id = "outlet";

//General global variables
long int time_value = 0;
int outputEEPROM = 10;
char json_c[200];
bool state = false;

//Objects
WiFiClientSecure client;
Homeware api(id, host, &client);

void setup() {
  //Set output pin using last state from the EEPROM
  pinMode(D0, OUTPUT);
  bool lastState = EEPROM.read(outputEEPROM);
  digitalWrite(D0, lastState);
  //Connect to a WiFI network
  Serial.begin(115200);
  Serial.println();
  Serial.print(F("Connecting to "));
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(F(""));
  Serial.println(F("WiFi connected"));
  Serial.println(F("IP address: "));
  Serial.println(WiFi.localIP());
  Serial.print(F("Connecting to "));
  Serial.println(host);
  //Get access token from the API
  Serial.println(F("Getting token"));
  api.getToken();
}

void loop() {

  //Check WiFi status
  if (WiFi.status() == WL_DISCONNECTED) {
    Serial.println("WiFi connection lost");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      Serial.print(".");
    }
    Serial.println("WiFi connection recovered");
  }

  //Get state
  if (millis() - time_value > 1000){
    strcpy(json_c, api.getJSON());
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, json_c);

    if (error) {
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.c_str());
    } else {
      state = doc["on"];
      if (state && !digitalRead(D0)){
          digitalWrite(D0, HIGH);
          EEPROM.write(outputEEPROM, 1);
          EEPROM.commit();
      } else if (!state && digitalRead(D0)) {
        digitalWrite(D0, LOW);
        EEPROM.write(outputEEPROM, 0);
        EEPROM.commit();
      }
    }

    time_value = millis();
  }

}
