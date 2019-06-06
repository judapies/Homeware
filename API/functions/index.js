'use strict';

const functions = require('firebase-functions');
const {smarthome} = require('actions-on-google');
const util = require('util');
const admin = require('firebase-admin');
var crypto = require("crypto");
var XMLHttpRequest = require('xhr2');

// Initialize Firebase
admin.initializeApp();
const firebaseRef = admin.database().ref('/status/');

//API constants
const deviceAliveTimeout = 20000;

exports.read = functions.https.onRequest((req, res) =>{
  //Hardware data
  var id = req.query.id;
  console.log('ID');
  console.log(id);
  //var trait = req.query.trait;
  //var state = req.query.state;
  var token = req.get("authorization").split(" ")[1];
  var agent = req.get("User-Agent").split(" ")[1];

  //Get tokenJSON from DDBB
  admin.database().ref('/token/').once('value')
  .then(function(snapshot) {
    var tokenJSON = snapshot.val();

    //Verify the token
    if (token == tokenJSON[agent]["access_token"]["value"]){
      //Save the new timestamp
      var current_date = new Date().getTime();
      admin.database().ref('/alive/').child(id).update({
        timestamp: current_date,
      });
      //Read state and send a response back
      firebaseRef.child(id).once('value').then(function(snapshot) {
        //var status = ";" + snapshot.val() + ";";
        res.status(200).json(snapshot.val());
      });

    } else { //If the token wasn't correct
      console.log("Hardware used an incorrect access token");
      res.status(200).send("Bad token");
    }
  });
});

// TOKEN HANDLERS
//Generate a new token
function tokenGenerator(agent, type){
  //Generate a random token
  var token = crypto.randomBytes(20).toString('hex');

  //Verify specials agents
  if (agent.indexOf("+http://www.google.com/bot.html") > 0){
    agent = "google";
  } else if (agent == "OpenAuth"){
    agent = "google";
  }

  var current_date = new Date().getTime();

  //Save the token in the DDBB
  if (type == "access_token"){
    admin.database().ref('/token/').child(agent).child("access_token").update({
        value: token,
        timestamp: current_date,
    });
  } else if (type == "authorization_code"){
    admin.database().ref('/token/').child(agent).child("authorization_code").update({
        value: token,
        timestamp: current_date,
    });
  } else if (type == "refresh_token"){
    admin.database().ref('/token/').child(agent).child("refresh_token").update({
        value: token,
        timestamp: current_date,
    });
  }

  return token;

}

// GOOGLE ENDPOINTS
//Verify Google client_id and check the user account
exports.fakeauth = functions.https.onRequest((request, response) => {
  //Get the tokens and ids from DDBB
  admin.database().ref('/token/').once('value')
  .then(function(snapshot) {
    var tokenJSON = snapshot.val();
    //Google data
    var client_id = request.query.client_id;

    //Verify the client_id from Google. (¿Are you Google?)
    if (client_id == tokenJSON["google"]["client_id"]){
      //Get a new authorization code for Google
      var code = tokenGenerator("google", "authorization_code");
      //Send the authorization code to Google by redirecting the user browser
      const responseurl = util.format('%s?code=%s&state=%s',
      decodeURIComponent(request.query.redirect_uri), code,
      request.query.state);
      return response.redirect(responseurl);
    } else {
      response.status(200).send("Algo ha ido mal en la autorización");
    }
  });

});

//Verify Google's authorization code and send the token
exports.faketoken = functions.https.onRequest((request, response) => {

  //Google data
  var grantType = request.query.grant_type ? request.query.grant_type : request.body.grant_type;
  var client_id = request.query.client_id ? request.query.client_id : request.body.client_id;
  var client_secret = request.query.client_secret ? request.query.client_secret : request.body.client_secret;
  if (grantType == "authorization_code") {
    var code = request.query.code ? request.query.code : request.body.code;
  } else {
    var code = request.query.refresh_token ? request.query.refresh_token : request.body.refresh_token;
  }
  var agent = request.get("User-Agent");

  if (code === undefined){
    code = request.get("code");
  }

  if (grantType === undefined){
    grantType = request.get("grant_type");
  }


  console.log("id");
  console.log(client_id);
  console.log(client_secret);
  console.log(agent);
  console.log(code);
  console.log(grantType);


  //Verify specials agents
  if (agent.indexOf("+http://www.google.com/bot.html") > 0){
    agent = "google";
  } else if (agent == "OpenAuth"){
    agent = "google";
  }

  //Get the tokens and ids from DDBB
  admin.database().ref('/token/').once('value')
  .then(function(snapshot) {
    var tokenJSON = snapshot.val();

    //Verify the client_id from Google. (¿Are you Google?)
    //if (client_id == tokenJSON["google"]["client_id"] && client_secret == tokenJSON["google"]["client_secret"] && code == tokenJSON["google"][refresh_token]){
    if (code == tokenJSON[agent][grantType]["value"]){

      //Tokens lifetime
      const secondsInDay = 86400;
      //Create a new token for Google
      var access_token = tokenGenerator(agent, "access_token");
      //Compose the JSON response for Google
      let obj;
      if (grantType === 'authorization_code') {
        //Create the refresh token
        var refresh_token = tokenGenerator(agent, "refresh_token");
        obj = {
          token_type: 'bearer',
          access_token: access_token,
          refresh_token: refresh_token,
          expires_in: secondsInDay,
        };
      } else if (grantType === 'refresh_token') {
        obj = {
          token_type: 'bearer',
          access_token: access_token,
          expires_in: secondsInDay,
        };
      }
      if (agent == "google"){
        //Clear authorization_code
        admin.database().ref('/token/').child(agent).child("authorization_code").update({
            value: "-",
        });
      }
      var current_date = new Date().getTime();
      var text = "Se ha conectado un nuevo dispositivo <br> <b>Agente</b>: " + agent + " <br> <b>Autenticación</b>: " + grantType;
      admin.database().ref('/events/').child(current_date).update({
        timestamp: current_date,
        title: "Conexión - Info",
        text: text,
        read: false,
      });
      response.status(200).json(obj);
    } else {
      let obj;
      obj = {
        error: "invalid_grant"
      };
      var current_date = new Date().getTime();
      var text = "Se ha rechazado a un dispositivo <br> <b>Agente</b>: " + agent + " <br> <b>Autenticación</b>: " + grantType + " <br> <b>Code</b>: " + code;
      admin.database().ref('/events/').child(current_date).update({
        timestamp: current_date,
        title: "Conexión - ALERT",
        text: text,
        read: false,
      });
      response.status(400).json(obj);
    }
  });

});

//Smarthome APP
const app = smarthome({
  debug: true,
  key: functions.config()['system']['api-key'],
  jwt: require('./key.json'),
});

//Google ask for the devices' list
app.onSync((body, headers) => {
  //Google data
  var token = headers.authorization.split(" ")[1];
  var agent = headers["user-agent"];
  console.log("1");

  //Verify specials agents
  if (agent.indexOf("+http://www.google.com/bot.html") > 0)
    agent = "google";
  else if (agent == "OpenAuth")
    agent = "google";

    console.log("2");


  //Get the tokens and ids from DDBB
  return admin.database().ref('/token/').once('value')
  .then(function(snapshot) {
    var tokenJSON = snapshot.val();
    console.log("3");

    //Verify the token
    if (token == tokenJSON[agent]["access_token"]["value"]){
      console.log("4");

      //Get the list of devices in JSON
      return admin.database().ref('/devices/').once('value')
      .then(function(snapshot) {
        var devicesJSON = snapshot.val();
        console.log(devicesJSON);

        //Send the JSON back to Google
        return {
          requestId: body.requestId,
          payload: {
            agentUserId: '123',
            devices: devicesJSON,
          },
        };

      });
    }
  });

});

//Google ask for the devices' states
app.onQuery((body, headers) => {
  //Google data
  var token = headers.authorization.split(" ")[1];
  var agent = headers["user-agent"];

  //Verify specials agents
  if (agent.indexOf("+http://www.google.com/bot.html") > 0)
    agent = "google";
  else if (agent == "OpenAuth")
    agent = "google";

  //Get the tokens and ids from DDBB
  return admin.database().ref('/token/').once('value')
  .then(function(snapshot) {
    var tokenJSON = snapshot.val();

    //Verify the token
    if (token == tokenJSON[agent]["access_token"]["value"]){
      //Update online status
      updatestates();
      //Get the list of online status in JSON
      return admin.database().ref('/status/').once('value').then(function(snapshot) {
        var statusJSON = snapshot.val();

        //Send the JSON back to Google
        return {
          requestId: body.requestId,
          payload: {
            devices: statusJSON
          }
        };
      });
    }
  });


});

//Google want to change something
app.onExecute((body, headers) => {
  //Google data
  var token = headers.authorization.split(" ")[1];
  var agent = headers["user-agent"];

  //Verify specials agents
  if (agent.indexOf("+http://www.google.com/bot.html") > 0)
    agent = "google";
  else if (agent == "OpenAuth")
    agent = "google";

  //Get the tokens and ids from DDBB
  return admin.database().ref('/token/').once('value')
  .then(function(snapshot) {
    var tokenJSON = snapshot.val();

    //Verify the accessn token
    if (token == tokenJSON[agent]["access_token"]["value"]){
      //Get the list of online status in JSON
      return admin.database().ref('/status/').once('value').then(function(snapshot) {
        var statusJSON = snapshot.val();

        //Compose the JSON for Google
        const {requestId} = body;
        const payload = {
          commands: [{
            ids: [],
            status: 'SUCCESS',
            states: {
            },
          }],
        };
        for (const input of body.inputs) {
          for (const command of input.payload.commands) {
            for (const device of command.devices) {
              const deviceId = device.id;
              payload.commands[0].ids.push(deviceId);
              for (const execution of command.execution) {
                const execCommand = execution.command;
                const {params} = execution;

                payload.commands[0].states.online = statusJSON[deviceId].online;
                switch (execCommand) {
                  case 'action.devices.commands.OnOff':
                    //firebaseRef.child(deviceId).child('OnOff').update({
                    firebaseRef.child(deviceId).update({
                      on: params.on,
                    });
                    payload.commands[0].states.on = params.on;
                    break;
                  case 'action.devices.commands.StartStop':
                    //firebaseRef.child(deviceId).child('StartStop').update({
                    firebaseRef.child(deviceId).update({

                      isRunning: params.start,
                    });
                    payload.commands[0].states.isRunning = params.start;
                    break;
                  case 'action.devices.commands.PauseUnpause':
                    //firebaseRef.child(deviceId).child('StartStop').update({
                    firebaseRef.child(deviceId).update({
                      isPaused: params.pause,
                    });
                    payload.commands[0].states.isPaused = params.pause;
                    break;
                  case 'action.devices.commands.BrightnessAbsolute':
                    //firebaseRef.child(deviceId).child('Brightness').update({
                    firebaseRef.child(deviceId).update({
                      brightness: params.brightness,
                    });
                    payload.commands[0].states.brightness = params.brightness;
                    break;
                  case 'action.devices.commands.OpenClose':
                    //firebaseRef.child(deviceId).child('OpenClose').update({
                    firebaseRef.child(deviceId).update({
                      openPercent: params.openPercent,
                    });
                    payload.commands[0].states.openState = params.openPercent;
                    break;
                }
              }
            }
          }
        }

        //Send the JSON back to Google
        return {
          requestId: requestId,
          payload: payload,
        };
      });
    } //else {}
  });

});

//Smarthome endpoint
exports.smarthome = functions.https.onRequest(app);

//We ask Google for a Sync request
exports.requestsync = functions.https.onRequest((request, response) => {

  console.info('Request SYNC for user');
  app.requestSync('123')
    .then((res) => {
      console.log('Request sync completed');
      response.json(res.data);
    }).catch((err) => {
      console.error(err);
    });

    response.status(200).send("Done");

});

//We send devices states to Google 'on change'
/*exports.reportstate = functions.database.ref('{deviceId}').onWrite((event) => {
  console.info('Firebase write event triggered this cloud function');
});*/

//We send devices to Google 'on change'
exports.reportdevices = functions.database.ref('/devices/').onUpdate(async (change, context) => {
  const snapshot = change.after.val();

  //Send an HTTPS request
  var xhttp = new XMLHttpRequest();
  xhttp.onreadystatechange = function () {
    if (this.readyState == 4 && this.status == 200) {
      console.log("Request SYNC success!");
    }
  };
  xhttp.open("POST", functions.config()['system']['api-uri'] + "/requestsync", true);
  xhttp.send();
});

//Update online states
function updatestates() {

  //Get timestamp values
  admin.database().ref('/alive/').once('value').then(function(snapshot) {
    var aliveJSON = snapshot.val();

    //Analize the JSON
    for (const device of Object.keys(aliveJSON)){
      var current_date=new Date().getTime();
      var timestamp = aliveJSON[device].timestamp;
      var online = true;

      //Verify if the device is online
      if (current_date - timestamp > deviceAliveTimeout){
        online = false;
      }
      //Change the value in the DDBB
      admin.database().ref('/status/').child(device).update({
        online: online,
      });
    }

  });

  return "Done";

}

function expireTokens(){

  //Get timestamp values
  admin.database().ref('/token/').once('value').then(function(snapshot) {
    var tokenJSON = snapshot.val();
    var accessTokenExpireTime = 10;

    //Analize the JSON
    for (const device of Object.keys(tokenJSON)){
      var current_date=new Date().getTime();

      var toCheck = ["access_token", "authorization_code"];
      var expireTime = [86400000, 20000];

      for (var i = 0; i < toCheck.length; i++){
        //Verify access token
        var timestamp = tokenJSON[device][toCheck[i]].timestamp;
        if (current_date - timestamp > expireTime[i]){
          if (device != "google"){
            console.log("Hardware's authorization_code is not changed for now")
          } else {
            //Change the value in the DDBB
            admin.database().ref('/token/').child(device).child(toCheck[i]).update({
              value: "-",
            });
          }
        }
      }

    }

  });

  return "Done";

}

exports.cron = functions.https.onRequest((request, response) => {
  updatestates();
  expireTokens();

  response.status(200).send("Done");
});
