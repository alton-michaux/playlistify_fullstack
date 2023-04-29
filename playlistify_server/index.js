require('dotenv').config()

const express = require('express');
const request = require('request');
const axios = require('axios')
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const qs = require('qs')

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const scope = process.env.SCOPES
const authorization_endpoint = process.env.AUTHORIZATION_URI
const PORT = process.env.PORT
/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function (length) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = 'spotify_auth_state';

const app = express();

app.use(express.static(__dirname + '/public'))
  .use(cors())
  .use(cookieParser());

app.get('/token', function (req, res) {
  const data = {
    grant_type: 'client_credentials'
  }

  axios.post(process.env.TOKEN_ENDPOINT, qs.stringify(data), {
    headers: {
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
    }
  }).then((response) => {
    const data = response.data.access_token
    res.send(data)
  }).catch((response) => {
    console.log("🚀 ~ file: index.js:56 ~ response:", response.message)
  })
});

app.get('/genres', function (req, res) {
  const queryParams = new URLSearchParams(req.query);

  axios.get(process.env.GENRE_ENDPOINT, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${queryParams.get("token")}`,
    }
  }).then((genres) => {
    const data = genres.data
    res.send(data)
  }).catch((genres) => {
    console.log("🚀 ~ file: index.js:83 ~ res:", genres.message)
  })
});

app.get('/playlists', function(req, res) {
  const queryParams = new URLSearchParams(req.query);
  const limit = 21;

  const response = axios.get(
    `https://api.spotify.com/v1/users/${process.env.USER_ID}/playlists?limit=${limit}&offset=0`,
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${queryParams.get('token')}`,
      }
    }
  ).then((response) => {
    const data = response.data.items;
    console.log("🚀 ~ file: index.js:89 ~ ).then ~ data:", data)
    res.send(data)
  }).catch((playlists) => {
    console.log("🚀 ~ file: index.js:83 ~ res:", playlists.message)
  });
  return response
})

app.get('/playlist', function(req, res) {
  const queryParams = new URLSearchParams(req.query);

  axios.get(
    `https://api.spotify.com/v1/playlists/${queryParams.get("playlistID")}`,
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${queryParams.get("token")}`,
      }
    }
  ).then((response) => {
    res.send(response.data);
  }).catch((response) => {
    throw new Error(`Error! status: ${response.status}`);
  });
});

app.get('/login', function (req, res) {

  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  res.redirect(authorization_endpoint +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', function (req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    const authOptions = {
      url: token_endpoint,
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {

        const access_token = body.access_token,
          refresh_token = body.refresh_token;

        const options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function (error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function (req, res) {

  // requesting access token from refresh token
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    url: token_endpoint,
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log(`Listening on ${PORT}`);

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
