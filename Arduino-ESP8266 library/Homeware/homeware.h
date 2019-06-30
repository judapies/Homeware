#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>


class Homeware{
private:
  char _request[600];
  char _request_a[300];
  char _request_b[300];
  char* _host;
  char* _id;
  char _code[50];
  char _token[41];
  char _ref[50];
  char _actual[50];
  char _state[50];
  char _json_c[200];

  WiFiClientSecure* _client;
  const int _httpsPort = 443;
public:
  //Homeware(int a);
  Homeware(char* id, char* host, WiFiClientSecure* client);
  void test();
  void getToken();
  char* getJSON();
  bool sendTrait(char* trait, char* value);
};
