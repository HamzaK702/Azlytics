import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.FORWARDING_ADDRESS}/google-auth/callback`  
);

export const getAuthUrl = (userId) => {
  const state = encodeURIComponent(userId); // Encode userId for safety
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: 'https://www.googleapis.com/auth/adwords',
    state: state // Add userId in the state parameter
  });
};

export const getToken = (code, callback) => {
  oauth2Client.getToken(code, (err, token) => {
    if (err) {
      console.error('Error retrieving access token:', err);
      return callback(err);
    }
    oauth2Client.setCredentials(token);
    callback(null, token);
  });
};
