document.addEventListener('DOMContentLoaded', function() {
   handleFBLogin();
});

function facebookLogin() {
  FB.login(function(response) {
    if (response.authResponse) {
      console.log('Welcome! Fetching your information...');
      FB.api('/me', {fields: 'name,email'}, function(response) {
        console.log('Successful login for: ' + response.name);
        // Here, you can also redirect the user or perform other actions like setting cookies or updating your database
      });
    } else {
      console.log('User cancelled login or did not fully authorize.');
    }
  }, {scope: 'email,public_profile', return_scopes: true});
}

function handleFBLogin() {
  (function(d, s, id) {
   var js, fjs = d.getElementsByTagName(s)[0];
   if (d.getElementById(id)) return;
   js = d.createElement(s); js.id = id;
   js.src = "https://connect.facebook.net/en_US/sdk.js";
   fjs.parentNode.insertBefore(js, fjs);
   }(document, 'script', 'facebook-jssdk'));

  window.fbAsyncInit = function() {
    FB.init({
      appId      : '781092294077026', // Replace YOUR_APP_ID with your actual app ID
      cookie     : true,
      xfbml      : true,
      version    : 'v9.0' // Replace with the Graph API version for your app
    });

    // Additional initialization code such as adding Event Listeners goes here
    FB.getLoginStatus(function(response) {
        statusChangeCallback(response);
    });

  };

  // Function to handle status changes
  function statusChangeCallback(response) {
    if (response.status === 'connected') {
      console.log('Logged in and authenticated');
      // Fetch user information and display it
    } else {
      console.log('Not authenticated');
    }
  }
}
