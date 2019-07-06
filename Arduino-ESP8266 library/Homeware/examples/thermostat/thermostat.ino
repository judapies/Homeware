#include <homeware.h>
#include <EEPROM.h>


//Config this section
const char* ssid = "your-wifi-ssid";
const char* password = "your-wifi-password";
char* host = "us-central1-[id].cloudfunctions.net";
char* id = "thermostat";

//General global variables
long int time_value = 0;
int outputEEPROM = 10;
char json_c[200];
char mode[30];
int temperatureSetPoint = 0;

//Objects
WiFiClientSecure client;
Adafruit_BMP280 bmp;
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

  if (!bmp.begin()) {
    Serial.println(F("Could not find the sensor, check wiring or I2C address"));
  }
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

  //Get state or token
  if (millis() - time_value > 1000){
    //Send temperature
    char n[2];
    int i=bmp.readTemperature();
    sprintf(n, "%d", i);
    api.sendTrait("thermostatTemperatureAmbient", n, "int");
    //Get mode and temperarure
    strcpy(json_c, api.getJSON());
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, json_c);
    if (error) {
      Serial.print(F("deserializeJson() failed: "));
      Serial.println(error.c_str());
    } else {
      strcpy(mode, doc["thermostatMode"]);
      temperatureSetPoint = doc["thermostatTemperatureSetpoint"];
      Serial.print(mode);
      Serial.print(" - ");
      Serial.println(temperatureSetPoint);

    }
    time_value = millis();
  }

}
