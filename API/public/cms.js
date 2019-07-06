(function () {

  var config = {
    apiKey: "<your-apikey>",
    authDomain: "<project-id>.firebaseapp.com",
    databaseURL: "https://<project-id>.firebaseio.com",
  };

  firebase.initializeApp(config);

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
