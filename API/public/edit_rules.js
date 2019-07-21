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
  var rulesRef = firebase.database().ref('rules');


  rulesRef.on('value', snap => {

      if (getParameterByName("n")){
        var n = parseInt(getParameterByName("n"));
        var rule = snap.val()[n];
        //Get the vector index
        document.getElementById("n").value = getParameterByName("n");

        statusRef.once('value', statusSnap => {
          var generalStatus = statusSnap.val();
          //Create the trigger id list
          var selectHTML = '';
          Object.keys(generalStatus[rule.trigger.id]).forEach(function(status){
            selectHTML += '<option>' + status + '</option>';
          });
          triggerParam.innerHTML = selectHTML;
          //Select the trigger's data
          devicesRef.once('value', devicesSnap => {
            var devices = {};
            //Get a relation between id and names
            Object(devicesSnap.val()).forEach(function(device){
              devices[device.id] = device.name.nicknames[0];
            });
            //Create the list items
            var generalStatus = statusSnap.val();
            var selectHTML = '<option>Selecct the trigger...</option>';
            Object.keys(generalStatus).forEach(function(id){
              selectHTML += '<option value="' + id + '">' + devices[id] + '</option>';
            });

            triggerId.innerHTML = selectHTML;
            targetId.innerHTML = selectHTML;
            document.getElementById("triggerId").value = rule.trigger.id;
            document.getElementById("triggerParam").value = rule.trigger.param;
            document.getElementById("triggerValue").value = rule.trigger.value;
            //Create the targets
            var targetHTML = '';
            Object(rule.targets).forEach(function(target){
              targetHTML += composeTarget(devices[target.id], target.id, target.param, target.value)
            });
            badge_targets_container.innerHTML = targetHTML;
            document.getElementById("availableTargets").value = JSON.stringify(rule.targets);
          });
        });
      } else {
        statusRef.once('value', statusSnap => {
          devicesRef.once('value', devicesSnap => {
            var devices = {};
            //Get a relation between id and names
            Object(devicesSnap.val()).forEach(function(device){
              devices[device.id] = device.name.nicknames[0];
            });
            //Create the list items
            var generalStatus = statusSnap.val();
            var selectHTML = '<option>Selecct the trigger...</option>';
            Object.keys(generalStatus).forEach(function(id){
              selectHTML += '<option value="' + id + '">' + devices[id] + '</option>';
            });

            triggerId.innerHTML = selectHTML;
            targetId.innerHTML = selectHTML;
          });
        });
        //Assign a vector index
        if(snap.val()){
          document.getElementById("n").value = snap.val().length;
        } else {
          document.getElementById("n").value = 0;
        }
      }

  });

  triggerId.addEventListener('change', function(){
    statusRef.once('value', statusSnap => {
      var generalStatus = statusSnap.val();
      var selectHTML = '';
      Object.keys(generalStatus[document.getElementById("triggerId").value]).forEach(function(status){
        selectHTML += '<option>' + status + '</option>';
      });

      triggerParam.innerHTML = selectHTML;

    });
  });

  targetId.addEventListener('change', function(){
    statusRef.once('value', statusSnap => {
      var generalStatus = statusSnap.val();
      var selectHTML = '';
      Object.keys(generalStatus[document.getElementById("targetId").value]).forEach(function(status){
        selectHTML += '<option>' + status + '</option>';
      });

      targetParam.innerHTML = selectHTML;

    });
  });

  save.addEventListener('click', e => {
    //Create the new toggle JSON
    var value = document.getElementById("triggerValue").value;
    var num = ["0","1","2","3","4","5","6","7","8","9"];
    if (value == "true"){
      value = true;
    } else if (value == "false") {
      value = false;
    } else if (num.indexOf(value[0]) >= 0) {
      value = parseInt(value);
    }
    //Compose JSON
    var rule = {
      trigger: {
        id: document.getElementById("triggerId").value,
        param: document.getElementById("triggerParam").value,
        value: value
      },
      targets: []
    }

    //Get targets JSON
    if (document.getElementById("availableTargets").value != "-1"){
      rule.targets = JSON.parse(document.getElementById("availableTargets").value);
    }

    console.log(rule);

    //Save the data in the database
    var n = document.getElementById("n").value;
    if (getParameterByName('n')){
      rulesRef.child(n).update(rule).then(function() {
        //Make alert show up
       $('#alertContainer').html('<div class="alert alert-success fade show" role="alert" id="savedAlert"> <b>Success!</b> The rule has been saved correctly.</div>');
       $('#savedAlert').alert()
       setTimeout(function() {
          $("#savedAlert").remove();
        }, 5000);
      })
      .catch(function(error){
        html = '<div class="alert alert-danger fade show" role="alert" id="deletedAlert"> <b>Error!</b> The rule hasn\'t been saved.</div>';
        //Make alert show up
        $('#alertContainer').html(html);
        $('#deletedAlert').alert()
        setTimeout(function() {
          $("#deletedAlert").remove();
        }, 5000);
      });
    } else {
      rulesRef.child(n).update(rule).then(function() {
        window.location.href = "/cms/rules/";
      })
      .catch(function(error){
        html = '<div class="alert alert-danger fade show" role="alert" id="deletedAlert"> <b>Error!</b> The rule hasn\'t been saved.</div>';
        //Make alert show up
        $('#alertContainer').html(html);
        $('#deletedAlert').alert()
        setTimeout(function() {
          $("#deletedAlert").remove();
        }, 5000);
      });
    }
  });

  add_targets_button.addEventListener('click', e => {
    //Get lasst JSON
    var availableTargets = [];
    if (document.getElementById("availableTargets").value != "-1"){
      availableTargets = JSON.parse(document.getElementById("availableTargets").value);
    }
    //Create the new toggle JSON
    var value = document.getElementById("targetValue").value;
    var num = ["0","1","2","3","4","5","6","7","8","9"];
    if (value == "true"){
      value = true;
    } else if (value == "false") {
      value = false;
    } else if (num.indexOf(value[0]) >= 0) {
      value = parseInt(value);
    }
    var newTarget = {
      id: document.getElementById("targetId").value,
      param: document.getElementById("targetParam").value,
      value: value
    }

    availableTargets.push(newTarget);
    document.getElementById("availableTargets").value = JSON.stringify(availableTargets);
    console.log(availableTargets);
    //Create the new HTML card
    var html = "";
    devicesRef.once('value', devicesSnap => {
      var devices = {};
      //Get a relation between id and names
      Object(devicesSnap.val()).forEach(function(device){
        devices[device.id] = device.name.nicknames[0];
      });
      html += composeTarget(devices[document.getElementById("targetId").value], document.getElementById("targetId").value, document.getElementById("targetParam").value, document.getElementById("targetValue").value);
      document.getElementById("badge_targets_container").innerHTML += html;
      //Clear form
      document.getElementById("targetValue").value = "";
    });


  });

  deleteDevice.addEventListener('click', e => {

    if (confirm("Do you want to delete the device?")){
      var n = document.getElementById("n").value;
      var html = "";
      rulesRef.child(n).remove()
        .then(function() {
          html = '<div class="alert alert-warning fade show" role="alert" id="deletedAlert"> <b>Success!</b> The rule has been deleted correctly.</div>';
          //Make alert show up
          $('#alertContainer').html(html);
          $('#deletedAlert').alert()
          setTimeout(function() {
              $("#deletedAlert").remove();
          }, 5000);
        })
        .catch(function(error){
          html = '<div class="alert alert-danger fade show" role="alert" id="deletedAlert"> <b>Error!</b> The rule hasn\'t been deleted.</div>';
          //Make alert show up
          $('#alertContainer').html(html);
          $('#deletedAlert').alert()
          setTimeout(function() {
            $("#deletedAlert").remove();
          }, 5000);
        });

      window.location.href = "/cms/rules/";
    } else {
      //Make alert show up
       $('#alertContainer').html('<div class="alert alert-success fade show" role="alert" id="savedAlert"> <b>OK</b> The rule hasn\'t been deleted. Be careful!</div>');
       $('#savedAlert').alert()
       setTimeout(function() {
          $("#savedAlert").remove();
        }, 5000);
    }


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

////////////////////////////////////////
//Targets Magic
////////////////////////////////////////
/*function addTarget(){
  //Get lasst JSON
  var availableTargets = [];
  if (document.getElementById("availableTargets").value != "-1"){
    availableTargets = JSON.parse(document.getElementById("availableTargets").value);
  }
  //Create the new toggle JSON
  var value = document.getElementById("targetValue").value;
  var num = ["0","1","2","3","4","5","6","7","8","9"];
  if (value == "true"){
    value = true;
  } else if (value == "false") {
    value = false;
  } else if (num.indexOf(value[0]) >= 0) {
    value = parseInt(value);
  }
  var newTarget = {
    id: document.getElementById("targetId").value,
    param: document.getElementById("targetParam").value,
    value: value
  }

  availableTargets.push(newTarget);
  document.getElementById("availableTargets").value = JSON.stringify(availableTargets);
  console.log(availableTargets);
  //Create the new HTML card
  var html = "";
  html += composeTarget(document.getElementById("targetId").value, document.getElementById("targetParam").value, document.getElementById("targetValue").value);
  document.getElementById("badge_targets_container").innerHTML += html;

  //Clear form
  document.getElementById("targetValue").value = "";
}*/

function deleteTarget(id){
  var availableTargets = JSON.parse(document.getElementById("availableTargets").value);
  var newTargets = []

  var html = "";
  Object(availableTargets).forEach(function(target){
    if (target.id != id){
      html += composeTarget(target.id, target.id, target.param, target.value);
      newTargets.push(target);
    }
  });

  document.getElementById("availableTargets").value = JSON.stringify(newTargets);
  document.getElementById("badge_targets_container").innerHTML = html
}

function composeTarget(name, id, param, value){
  var html = "";
  html += '<div class="col-sm-6" style="margin-top: 10px;">';
    html += '<div class="card">';
      html += '<div class="card-body">';
        html += '<h5 class="card-title">' + name + '</h5>';
        html += '<p>' + param + ': ' + value + '</p>';
        html += '<button type="button" class="btn btn-danger" onclick="deleteTarget(\'' + id + '\')">Delete</button>';
      html += '</div>';
    html += '</div>';
  html += '</div>';

  return html;
}

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
    results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
