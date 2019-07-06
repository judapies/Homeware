(function () {

  var config = {
    apiKey: "<your-apikey>",
    authDomain: "<project-id>.firebaseapp.com",
    databaseURL: "https://<project-id>.firebaseio.com",
  };

  firebase.initializeApp(config);

  // Get a statusRef to the database service
  var statusRef = firebase.database().ref().child('status');
  var aliveRef = firebase.database().ref().child('alive');
  var tokensRef = firebase.database().ref().child('token');
  var devicesRef = firebase.database().ref().child('devices');

  devicesRef.on('value', snap => {
      //hello();
      var obj = snap.val();
      //Find device index
      document.getElementById("n").value = Object.keys(obj).length;
      Object.keys(obj).forEach(function(n){
        if (obj[n].id == getParameterByName('id')){
            document.getElementById("n").value = n;
        }
      });

      //Get device info
      Object(obj).forEach(function(device){
          if (device.id == getParameterByName('id')){
            document.getElementById("id").value = device.id;
            document.getElementById("id").readOnly = true;
            document.getElementById("type").value = device.type;
            document.getElementById("hwVersion").value = device.deviceInfo.hwVersion;
            document.getElementById("swVersion").value = device.deviceInfo.swVersion;
            document.getElementById("manufacturer").value = device.deviceInfo.manufacturer;
            document.getElementById("model").value = device.deviceInfo.model;
            document.getElementById("name").value = device.name.name;
            //Show traits
            updateTraits(device.traits);
            //Show default names
            var html = "";
            var string = "";
            Object(device.name.defaultNames).forEach(function(name){
              html += '<button type="button" class="btn btn-primary" style="margin: 5px;" title="Click to delete" onclick="deleteName(\'default_names\',\'' + name + '\')">' + name + '</button>';
              string += name + ';';
            });
            document.getElementById("badge_default_names_container").innerHTML = html;
            document.getElementById("default_names").value = string;
            //Show nick names
            var html = "";
            var string = "";
            Object(device.name.nicknames).forEach(function(name){
              html += '<button type="button" class="btn btn-primary" style="margin: 5px;" title="Click to delete" onclick="deleteName(\'nick_names\',\'' + name + '\')">' + name + '</button>';
              string += name + ';';
            });
            document.getElementById("badge_nick_names_container").innerHTML = html;
            document.getElementById("nick_names").value = string;
            //Show attributes
            if(device.attributes){
              if(device.attributes.availableToggles){
                var availableToggles = device.attributes.availableToggles;
                var html = "";
                Object(availableToggles).forEach(function(toggle){
                  html += composeToggle(toggle.name, toggle.names_values.lang, toggle.names_values.name_synonym);
                });

                document.getElementById("availableToggles").value = JSON.stringify(availableToggles);
                document.getElementById("badge_toggles_container").innerHTML = html
              }

              if(device.attributes.commandOnlyOnOff){
                document.getElementById("customSwitch_commandOnlyOnOff").checked = device.attributes.commandOnlyOnOff;
              }
            }
          }
      });


  });

  save.addEventListener('click', e => {
    //Compose JSON
    var device = {
      deviceInfo : {
        hwVersion: document.getElementById("hwVersion").value,
        manufacturer: document.getElementById("manufacturer").value,
        model:  document.getElementById("model").value,
        swVersion:  document.getElementById("swVersion").value
      },
      id: document.getElementById("id").value,
      name: {
        defaultNames: [],
        name: document.getElementById("name").value,
        nicknames: []
      },
      attributes:{
        availableToggles: []
      },
      traits: [],
      type: document.getElementById("type").value
    }

    //Save traits
    var traits=document.getElementById("trais");
    for (var i = 0; i < traits.options.length; i++) {
       if(traits.options[i].selected ==true){
            device.traits.push(traits.options[i].value);
        }
    }

    //Save default names
    var defaultNamesArray = [];
    var defaultNames=document.getElementById("default_names").value.split(";");
    defaultNames.pop();
    defaultNames.forEach(function(dName){
      defaultNamesArray.push(dName);
    });
    device.name.defaultNames = defaultNamesArray;

    //Save nick names
    var nickNamesArray = [];
    var nickNames=document.getElementById("nick_names").value.split(";");
    nickNames.pop();
    nickNames.forEach(function(nName){
      nickNamesArray.push(nName);
    });
    device.name.nicknames = nickNamesArray;

    //Save the available toggles
    var toggles = document.getElementById("availableToggles").value;
    if (toggles != "-1"){
      device.attributes.availableToggles = JSON.parse(toggles);
    }

    //Save commandOnlyOnOff
    device.attributes.commandOnlyOnOff = document.getElementById("customSwitch_commandOnlyOnOff").checked;

    //Save the data in the database
    var n = document.getElementById("n").value;
    devicesRef.child(n).update(device);
    console.log(device);
    statusRef.child(document.getElementById("id").value).update({
      online: true
    });
    //Save the new timestamp
    var current_date = new Date().getTime();
    aliveRef.child(document.getElementById("id").value).update({
      timestamp: current_date,
    });
    //Save the authorization_code
    var code = document.getElementById("id").value + "-code";
    tokensRef.child(document.getElementById("id").value).update({
      authorization_code: {
        value: code
      }
    });

    //Make alert show up
     $('#alertContainer').html('<div class="alert alert-success fade show" role="alert" id="savedAlert"> <b>Success!</b> The device has been saved correctly.</div>');
     $('#savedAlert').alert()
     setTimeout(function() {
        $("#savedAlert").remove();
      }, 5000);
  });

  deleteDevice.addEventListener('click', e => {
    var n = document.getElementById("n").value;
    var html = "";
    devicesRef.child(n).remove()
      .then(function() {
        html = '<div class="alert alert-warning fade show" role="alert" id="deletedAlert"> <b>Success!</b> The device has been deleted correctly.</div>';
        //Make alert show up
        $('#alertContainer').html(html);
        $('#deletedAlert').alert()
        setTimeout(function() {
            $("#deletedAlert").remove();
        }, 5000);
      })
      .catch(function(error){
        html = '<div class="alert alert-danger fade show" role="alert" id="deletedAlert"> <b>Error!</b> The device hasn\'t been deleted correctly.</div>';
        //Make alert show up
        $('#alertContainer').html(html);
        $('#deletedAlert').alert()
        setTimeout(function() {
          $("#deletedAlert").remove();
        }, 5000);
      });
    var id = document.getElementById("id").value;
    statusRef.child(id).remove();
    tokensRef.child(id).remove();
    aliveRef.child(id).remove();


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

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}

function addName(id){
  names = document.getElementById(id).value.split(";");
  names.pop();
  var new_names = document.getElementById("add_" + id).value.split(";");
  console.log(names);
  var html = "";
  var string = "";
  names.forEach(function(name){
    html += '<button type="button" class="btn btn-primary" style="margin: 5px;" title="Click to delete" onclick="deleteName(\'' + id + '\',\'' + name + '\')">' + name + '</button>';
    string += name + ';';
  });
  new_names.forEach(function(name){
    html += '<button type="button" class="btn btn-primary" style="margin: 5px;" title="Click to delete" onclick="deleteName(\'' + id + '\',\'' + name + '\')">' + name + '</button>';
    string += name + ';';
  });
  document.getElementById("badge_" + id + "_container").innerHTML = html;
  document.getElementById(id).value = string;
  document.getElementById("add_" + id).value = "";
}

function deleteName(id, delete_name){
  names = document.getElementById(id).value.split(";");
  names.pop();
  console.log(names);
  var html = "";
  var string = "";
  names.forEach(function(name){
    if (name != delete_name){
      html += '<button type="button" class="btn btn-primary" style="margin: 5px;" title="Click to delete" onclick="deleteName(\'' + id + '\',\'' + name + '\')">' + name + '</button>';
      string += name + ';';
    }
  });
  document.getElementById("badge_" + id + "_container").innerHTML = html;
  document.getElementById(id).value = string;
  document.getElementById("add_" + id).value = "";
}

function getElementsByIdStartsWith(container, selectorTag, prefix) {
    var items = [];
    var myPosts = document.getElementById(container).getElementsByTagName(selectorTag);
    for (var i = 0; i < myPosts.length; i++) {
        //omitting undefined null check for brevity
        if (myPosts[i].id.lastIndexOf(prefix, 0) === 0) {
            items.push(myPosts[i]);
        }
    }
    return items;
}

function updateTraits(deviceTrait){
  var tratis = {
    "action.devices.types.AC_UNIT": [
          "action.devices.traits.OnOff",
          "action.devices.traits.FanSpeed",
          "action.devices.traits.TemperatureSetting",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.AIRFRESHENER": [
          "action.devices.traits.OnOff",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.AIRPURIFIER": [
          "action.devices.traits.OnOff",
          "action.devices.traits.Toggles",
          "action.devices.traits.FanSpeed",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.AWNING": [
          "action.devices.traits.OpenClose",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.BLINDS": [
          "action.devices.traits.OpenClose",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.BOILER": [
          "action.devices.traits.OnOff",
          "action.devices.traits.TemperatureControl",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.CAMERA": [
          "action.devices.traits.CameraStream"
    ],
    "action.devices.types.COFFEE_MAKER": [
          "action.devices.traits.TemperatureControl",
          "action.devices.traits.OnOff",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.CURTAIN": [
          "action.devices.traits.OpenClose"
    ],
    "action.devices.types.DISHWASHER": [
          "action.devices.traits.OnOff",
          "action.devices.traits.StartStop",
          "action.devices.traits.RunCycle",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.DOOR": [
          "action.devices.traits.OpenClose"
    ],
    "action.devices.types.DRYER": [
          "action.devices.traits.OnOff",
          "action.devices.traits.StartStop",
          "action.devices.traits.Modes",
          "action.devices.traits.Toggles",
          "action.devices.traits.RunCycle"
    ],
    "action.devices.types.FAN": [
          "action.devices.traits.OnOff",
          "action.devices.traits.FanSpeed",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.FIREPLACE": [
          "action.devices.traits.OnOff",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.GARAGE": [
          "action.devices.traits.OpenClose"
    ],
    "action.devices.types.GATE": [
          "action.devices.traits.OpenClose"
    ],
    "action.devices.types.HEATER": [
          "action.devices.traits.OnOff",
          "action.devices.traits.TemperatureSetting",
          "action.devices.traits.FanSpeed",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.HOOD": [
          "action.devices.traits.OnOff",
          "action.devices.traits.Toggles",
          "action.devices.traits.FanSpeed",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.KETTLE": [
          "action.devices.traits.TemperatureControl",
          "action.devices.traits.OnOff",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.LIGHT" : [
          "action.devices.traits.Brightness",
          "action.devices.traits.ColorSetting",
          "action.devices.traits.OnOff"
    ],
    "action.devices.types.LOCK": [
          "action.devices.traits.LockUnlock"
    ],
    "action.devices.types.MICROWAVE": [
          "action.devices.traits.OnOff",
          "action.devices.traits.Timer",
          "action.devices.traits.StartStop",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.MOP": [
          "action.devices.traits.StartStop",
          "action.devices.traits.Toggles",
          "action.devices.traits.Dock",
          "action.devices.traits.Locator",
          "action.devices.traits.OnOff",
          "action.devices.traits.RunCycle",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.OUTLET": [
          "action.devices.traits.OnOff"
    ],
    "action.devices.types.OVEN": [
          "action.devices.traits.TemperatureControl",
          "action.devices.traits.StartStop",
          "action.devices.traits.OnOff",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.PERGOLA": [
          "action.devices.traits.OpenClose"
    ],
    "action.devices.types.REFRIGERATOR": [
          "action.devices.traits.TemperatureControl",
          "action.devices.traits.OnOff",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.SECURITYSYSTEM": [
          "action.devices.traits.ArmDisarm",
          "action.devices.traits.StatusReport"
    ],
    "action.devices.types.SHOWER": [
          "action.devices.traits.OnOff",
          "action.devices.traits.Modes",
          "action.devices.traits.TemperatureControl",
          "action.devices.traits.StartStop"
    ],
    "action.devices.types.SHUTTER": [
          "action.devices.traits.OpenClose",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.SPRINKLER": [
          "action.devices.traits.StartStop"
    ],
    "action.devices.types.SWITCH": [
          "action.devices.traits.OnOff"
    ],
    "action.devices.types.THERMOSTAT": [
          "action.devices.traits.TemperatureSetting"
    ],
    "action.devices.types.VACUUM": [
          "action.devices.traits.Dock",
          "action.devices.traits.Locator",
          "action.devices.traits.OnOff",
          "action.devices.traits.RunCycle",
          "action.devices.traits.StartStop",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.VALVE": [
          "action.devices.traits.OpenClose"
    ],
    "action.devices.types.WASHER": [
          "action.devices.traits.OnOff",
          "action.devices.traits.StartStop",
          "action.devices.traits.Modes",
          "action.devices.traits.Toggles",
          "action.devices.traits.RunCycle"
    ],
    "action.devices.types.WATERHEATER": [
          "action.devices.traits.OnOff",
          "action.devices.traits.TemperatureControl",
          "action.devices.traits.Toggles",
          "action.devices.traits.Modes"
    ],
    "action.devices.types.WINDOW": [
          "action.devices.traits.LockUnlock",
          "action.devices.traits.OpenClose"
    ]
  }

  var traitsList = [
    "action.devices.traits.Toggles",
    "action.devices.traits.ArmDisarm",
    "action.devices.traits.CameraStream",
    "action.devices.traits.ColorSetting",
    "action.devices.traits.FanSpeed",
    "action.devices.traits.LightEffects",
    "action.devices.traits.Modes",
    "action.devices.traits.OnOff",
    "action.devices.traits.OpenClose",
    "action.devices.traits.Scene",
    "action.devices.traits.StartStop",
    "action.devices.traits.TemperatureControl",
    "action.devices.traits.TemperatureSetting",
    "action.devices.traits.Timer",

  ];

  traitsList.forEach(function(trait){
    document.getElementById(trait).style.display = "none";
  });

  var html = "";
  Object(tratis[document.getElementById("type").value]).forEach(function(trait){

        if(deviceTrait.indexOf(trait) >= 0){
          html += '<option selected>' + trait + '</option>';
        } else {
          html += '<option>' + trait + '</option>';
        }
  });
  document.getElementById("trais").innerHTML = html;

  updateTraitsDependencies();
}

function updateTraitsDependencies(){

  //Save traits
  var traits=document.getElementById("trais");
  for (var i = 0; i < traits.options.length; i++) {
    if(document.getElementById(traits.options[i].value)){
     if(traits.options[i].selected ==true){
        document.getElementById(traits.options[i].value).style.display = "block";
      } else {
        document.getElementById(traits.options[i].value).style.display = "none";
      }
    }
  }
}

////////////////////////////////////////
//Toggle Magic
////////////////////////////////////////
function addToggle(){
  //Get lasst JSON
  var availableToggles = [];
  if (document.getElementById("availableToggles").value != "-1"){
    availableToggles = JSON.parse(document.getElementById("availableToggles").value);
  }
  //Create the new toggle JSON
  var newToggle = {
    name: document.getElementById("name_toggle").value,
    names_values: {
      name_synonym: [

      ],
      lang: document.getElementById("languaje_toggle").value
    }
  }

  var synonyms = document.getElementById("synonyms_toggle").value.split(";");
  newToggle.names_values.name_synonym = synonyms;
  //Save the new JSON
  availableToggles.push(newToggle);
  document.getElementById("availableToggles").value = JSON.stringify(availableToggles);
  console.log(newToggle);
  //Create the new HTML card
  var html = "";
  html += composeToggle(document.getElementById("name_toggle").value, document.getElementById("languaje_toggle").value, synonyms);
  document.getElementById("badge_toggles_container").innerHTML += html;

  //Clear form
  document.getElementById("name_toggle").value = "";
  document.getElementById("synonyms_toggle").value = "";
}

function deleteToggle(name){
  var availableToggles = JSON.parse(document.getElementById("availableToggles").value);
  var newToggles = []

  var html = "";
  Object(availableToggles).forEach(function(toggle){
    if (toggle.name != name){
      html += composeToggle(toggle.name, toggle.names_values.lang, toggle.names_values.name_synonym);
      newToggles.push(toggle);
    }
  });

  document.getElementById("availableToggles").value = JSON.stringify(newToggles);
  document.getElementById("badge_toggles_container").innerHTML = html
}

function composeToggle(name, lang, synonyms){
  var html = "";
  html += '<div class="col-sm-6" style="margin-top: 10px;">';
    html += '<div class="card">';
      html += '<div class="card-body">';
        html += '<h5 class="card-title">' + name + ' - ' + lang + '</h5>';
        synonyms.forEach(function(word){
          html += '<span class="badge badge-primary" style="margin: 5px;">' + word + '</span>';
        });
        html += '<br><br>';
        html += '<button type="button" class="btn btn-danger" onclick="deleteToggle(\'' + name + '\')">Delete</button>';
      html += '</div>';
    html += '</div>';
  html += '</div>';

  return html;
}
