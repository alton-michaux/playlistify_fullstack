require('dotenv').config()

const express = require('express');
const axios = require('axios')
const cors = require('cors');
const cookieParser = require('cookie-parser');
const qs = require('qs')
const passport = require('passport')
const SpotifyStrategy = require('passport-spotify').Strategy;

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const scope = process.env.SCOPES
const authorization_endpoint = process.env.AUTHORIZATION_URI
const PORT = process.env.PORT

passport.use(
  new SpotifyStrategy(
    {
      clientID: client_id,
      clientSecret: client_secret,
      scope: scope,
      callbackURL: redirect_uri
    },
    function (accessToken, refreshToken, expires_in, profile, done) {
      User.findOrCreate({ spotifyId: profile.id }, function (err, user) {
        const data = done(err, user);
        res.send(data)
      });
    }
  )
);

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
    res.send({ error: response.message })
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
  }).then((response) => {
    const data = response.data
    res.send(data)
  }).catch((response) => {
    res.send({ error: response.message })
  })
});

app.get('/playlists', function (req, res) {
  const queryParams = new URLSearchParams(req.query);
  const limit = 21;

  axios.get(
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
    res.send(data)
  }).catch((response) => {
    res.send({ error: response.message })
  });
})

app.get('/playlist', function (req, res) {
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
    const data = response.data
    res.send(data)
  }).catch((response) => {
    res.send({ error: response.message })
  });
});

app.get('/tracklist', function (req, res) {
  const queryParams = new URLSearchParams(req.query);

  axios.get(`https://api.spotify.com/v1/playlists/${queryParams.get('playlistID')}/tracks`,
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${queryParams.get('token')}`,
      },
    }
  ).then((response) => {
    const data = response.data;
    res.send(data)
  }).catch((response) => {
    res.send({ error: response.message })
  })
})

app.get('/song', function (req, res) {
  const queryParams = new URLSearchParams(req.query);

  axios.get(`https://api.spotify.com/v1/tracks/${queryParams.get('trackID')}`,
    {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${queryParams.get('token')}`,
      },
    }
  ).then((response) => {
    const data = response.data
    res.send(data)
  }).catch((response) => {
    res.send({ error: response.message })
  })
})

app.get('/login', passport.authenticate('spotify'));

app.get('/callback', passport.authenticate('spotify', { failureRedirect: '/login' }),
  function (req, res) {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

console.log(`Listening on ${PORT}`);

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
