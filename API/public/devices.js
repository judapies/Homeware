(function () {

  firebase.initializeApp(config);

  // Get a status to the database service
  var database = firebase.database();
  var statusRef = database.ref().child('status');
  var devicesRef = database.ref().child('devices');

  statusRef.on('value', status_snap => {
    devicesRef.once('value', snap => {
        var status = status_snap.val();
        var devices = snap.val();
        var scenesHTML = '';
        var html = '';
        Object(devices).forEach(function(device){
          var paragraph = "";
          var color = "ffff00";
          //Get color
          if (status[device.id].color){
            var colorInt = status[device.id].color.spectrumRGB;
            var colorHex = colorInt.toString(16);
            var rest = 6 - colorHex.length;
            color = "";
            for(var i = 0; i < rest; i++){
                color += "0";
            }
            color += colorHex;

          }
          //Get OnOff
          var opacity = "0.4";
          if (status[device.id].on == true){
            opacity = "1";
          }
          //Online state
          var label = "Offline";
          var label_class = "badge-danger";
          if (status[device.id].online == true){
            label = "Online";
            label_class = "badge-success";
          }
          //Scenes & devices
          if (device.traits[0] == 'action.devices.traits.Scene'){
            scenesHTML += '<div class="card" style="width: 30%; margin-bottom: 15px; margin-right: 3%;">';
              scenesHTML += '<div class="colorRectangle" style="background-color:#' + color + '; opacity:' + opacity + '"></div>';
              scenesHTML += '<div class="card-body">';
                scenesHTML += '<div class="grid" style="margin-bottom:10px;">';
                  scenesHTML += '<div class="row">';
                    scenesHTML += '<div class="col"><h5 class="card-title">' + device.name.nicknames[0] + '</h5></div>';
                    scenesHTML += '<div class="col" style="text-align:right;"><span class="badge ' + label_class + '" >' + label + '</span></div>';
                  scenesHTML += '</div>';
                  scenesHTML += '<div class="row">';
                    scenesHTML += '<div class="col">' + paragraph + '</div>';
                    scenesHTML += '<div class="col" style="vertical-align:top; text-align:right;"><a href="/cms/devices/edit/?id=' + device.id + '" class="btn btn-primary">Edit</a></div>';
                  scenesHTML += '</div>';
                scenesHTML += '</div>';
              scenesHTML += '</div>';
            scenesHTML += '</div>';
          } else {
            //Get brightness
            if (status[device.id].brightness){
              paragraph += "<b>Brightness:</b> " + status[device.id].brightness + " %<br><br>";
            }
            //Get Modes
            if (status[device.id].thermostatMode){
              paragraph += "<b>Mode:</b> " + status[device.id].thermostatMode + "<br>";
              paragraph += "<b>Ambient:</b> " + status[device.id].thermostatTemperatureAmbient + " ºC <br>";
              paragraph += "<b>Set point:</b> " + status[device.id].thermostatTemperatureSetpoint + " ºC <br> <br>";
              switch (status[device.id].thermostatMode) {
                case "cool":
                  color = "69D4FF";
                  opacity = "1";
                  break;
                case "heat":
                  color = "FF0000";
                  opacity = "1";
                  break;
                case "off":
                  color = "AAAAAA";
                  opacity = "1";
                  break;

              }
            }

            html += '<div class="card" style="width: 30%; margin-bottom: 15px; margin-right: 3%;">';
              html += '<div class="colorRectangle" style="background-color:#' + color + '; opacity:' + opacity + '"></div>';
              html += '<div class="card-body">';
                html += '<div class="grid" style="margin-bottom:10px;">';
                  html += '<div class="row">';
                    html += '<div class="col"><h5 class="card-title">' + device.name.nicknames[0] + '</h5></div>';
                    html += '<div class="col" style="text-align:right;"><span class="badge ' + label_class + '" >' + label + '</span></div>';
                  html += '</div>';
                  html += '<div class="row">';
                    html += '<div class="col">' + paragraph + '</div>';
                    html += '<div class="col" style="vertical-align:top; text-align:right;"><a href="/cms/devices/edit/?id=' + device.id + '" class="btn btn-primary">Edit</a></div>';
                  html += '</div>';
                html += '</div>';
              html += '</div>';
            html += '</div>';
          }
        });
        devicesList.innerHTML = html;
        scenesList.innerHTML = scenesHTML;


    });
  });

  logout.addEventListener('click', e =>{
    firebase.auth().signOut();
  });

  firebase.auth().onAuthStateChanged(firebaseUser => {
    if (firebaseUser){
      console.log('Logged in');
    } else {
      console.log('Not logged in');
      window.location.href = "/cms/login/";
    }
  });


}());
