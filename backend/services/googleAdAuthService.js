// const { google } = require('googleapis');
// const OAuth2 = google.auth.OAuth2;

// const oauth2Client = new OAuth2(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   'YOUR_REDIRECT_URI'   
// );

// const authUrl = oauth2Client.generateAuthUrl({
//   access_type: 'offline',
//   scope: 'https://www.googleapis.com/auth/adwords'
// });

// console.log('Authorize this app by visiting this url:', authUrl);

// // After user grants access, you will receive an authorization code
// const code = 'YOUR_AUTHORIZATION_CODE';

// oauth2Client.getToken(code, (err, token) => {
//   if (err) return console.error('Error retrieving access token', err);
//   oauth2Client.setCredentials(token);   

// });

//Implementation level code below
const { google } = require('googleapis');
const OAuth2 = google.auth.OAuth2;
const express = require('express'); // Assuming you're using Express

const app = express();

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  // Replace with your redirect URI configured in Google Cloud Console
  'http://localhost:3001/api/google-auth/callback' // Example redirect URI
);

app.get('/api/google-auth', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/adwords' // Replace with your desired scopes
  });

  res.redirect(authUrl); // Redirect user to Google authorization page
});

// Handle authorization code received from Google
app.get('/api/google-auth/callback', (req, res) => {
  const code = req.query.code; // Extract authorization code from query parameters

  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token:', err);

    oauth2Client.setCredentials(token);   
 // Store access token securely

    // Use the access token to make Google Ads API calls in subsequent requests
    // ... your Google Ads API calls here ...

    res.send('Authorization successful!'); // Send a success message
  });
});
