#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <EEPROM.h>

//Config this section
const char* ssid = "your-wifi-ssid";
const char* password = "your-wifi-password";
const char* host = "us-central1-[id].cloudfunctions.net";
String id = "outlet";

//HTTPS info
const int httpsPort = 443;
//const char fingerprint[] PROGMEM = "50 6B F9 85 7D A3 C1 0A 31 4B CF EA 50 40 AE 5D 39 FE 63 EF";

//General global variables
String access_token = "no";
String code = "-code";
char ref[5] = "on\":";
char actual[5] = "";
String request = "";
long int time_value = 0;
int outputEEPROM = 10;

WiFiClientSecure client;

void setup() {
  pinMode(D0, OUTPUT);
  bool lastState = EEPROM.read(outputEEPROM);
  digitalWrite(D0, lastState);

  Serial.begin(115200);
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.println("IP address: ");
  Serial.println(WiFi.localIP());

  Serial.print("Connecting to ");
  Serial.println(host);

  //client.setFingerprint(fingerprint);
  client.setInsecure();

  Serial.println("Getting token");
  while (access_token.length() == 40 ){
    getToken();
    delay(500);
  }

  //Compose the request
  request += "GET /read/?id=";
  request += id;
  request +=" HTTP/1.1\r\n";
  request +="Host: ";
  request += host;
  request +="\r\n";
  request += "User-Agent: ARC ";
  request += id;
  request +="\r\n";
  request += "authorization: bearer ";
  //Compose authorization_code
  code = id + code;

}

void loop() {
  //Read the push button as LOW Level
  checkPushButton();

  //Check WiFi status
  if (WiFi.status() == WL_DISCONNECTED) {
    Serial.println("WiFi connection lost");
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
      delay(500);
      checkPushButton();
      Serial.print(".");
    }
    Serial.println("WiFi connection recovered");
  }

  //Get state or token
  if (millis() - time_value > 1000){
    if(access_token != "no"){
      hiGoogle();
    }
    else {
      getToken();
      delay(15000);
    }
    time_value = millis();
  }

}

//Get state from the API
void hiGoogle(){

  if (!client.connect(host, httpsPort)) {
    Serial.println("connection failed");
    delay(15000);
    return;
  }
  //Send the request
  client.print(request);
  //A creepy way to read the state ;-)
  bool detected = false;
  String state = "";
  while (client.connected()) {
    actual[0] = actual[1];
    actual[1] = actual[2];
    actual[2] = actual[3];
    actual[3] = client.read();

    if (actual[3] == ',')
      detected = false;

     if (detected)
      state += actual[3];

    if (strcmp(actual, ref) == 0)
      detected = true;

  }

  //Change realy state
  Serial.println(state);
  if ( state == "true" && !digitalRead(D0)) {
      digitalWrite(D0, HIGH);
      EEPROM.write(outputEEPROM, 1);
      EEPROM.commit();
    } else if ( state == "false" && digitalRead(D0)) {
      digitalWrite(D0, LOW);
      EEPROM.write(outputEEPROM, 0);
      EEPROM.commit();
    }

}

void getToken(){

  if (!client.connect(host, httpsPort)) {
    Serial.println("connection failed");
    return;
  }

  //Send the request
  client.print(String("GET ") + "/token/" + " HTTP/1.1\r\n" +
               "Host: " + host + "\r\n" +
               "User-Agent: " + id + "\r\n" +
               "code: " + code + "\r\n" +
               "grant_type: authorization_code\r\n" +
               "Connection: close\r\n\r\n");


  //Read the access_token
  String line;
  int past = millis();
  while (client.connected() || (millis() - past < 5000)) {
    char c = client.read();
    //Serial.print(c);
    line += c;
  }

  int start_char_p = line.indexOf("access_token\":\"") + 15;
  String token_local = "";

  for (int i = start_char_p; i < line.length(); i++){
    if (line[i] != '"')
      token_local +=  line[i];
    else
      break;
  }

   //Compose the rest of the request
  request += token_local;
  request += "\r\n" "Connection: close\r\n\r\n";
  //Save the token
  access_token = token_local;
  Serial.print("Token de acceso: ");
  Serial.println(token_local);
}

//Check the button
void checkPushButton(){
  if (digitalRead(D2) == LOW){
      if (digitalRead(D0) == HIGH){
        digitalWrite(D0, LOW);
        EEPROM.write(outputEEPROM, 0);
        EEPROM.commit();
      } else  {
        digitalWrite(D0, HIGH);
        EEPROM.write(outputEEPROM, 1);
        EEPROM.commit();
      }
      delay(200);
  }
}
