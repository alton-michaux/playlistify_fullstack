require('dotenv').config()

const proxy = require('./setup/setupProxy')

const express = require('express');
const axios = require('axios')
const cors = require('cors');
const cookieParser = require('cookie-parser');
const qs = require('qs')
const utils = require('./utils/authUtils');

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;
const scope = process.env.SCOPES;
const authorization_endpoint = process.env.AUTHORIZATION_URI;
const PORT = process.env.PORT;

const app = express();

app.use(express.static(__dirname + '/public'))
  .use(cors({ origin: 'http://localhost:3000', proxy: proxy }))
  .use(cookieParser())

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

app.get('/login', function (req, res) {
  const state = utils.authUtils.randomString(16)
  const stateKey = utils.authUtils.stateKey;
  res.cookie(stateKey, state);

  const queryString = qs.stringify({
    client_id: client_id,
    response_type: 'code',
    redirect_uri: redirect_uri,
    state: state,
    scope: scope,
  })

  res.send(`${authorization_endpoint}${queryString}`)
});

app.get('/callback', function (req, res) {
  const queryParams = new URLSearchParams(req.query);

  const data = {
    grant_type: 'authorization_code',
    code: queryParams.get('code'),
    redirect_uri: redirect_uri,
  }

  if ((queryParams.get('state')) === null) {
    res.send({ error: 'state mismatch' });
  }

  axios.post(process.env.TOKEN_ENDPOINT,qs.stringify(data), {
    headers: {
      'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64')),
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }
  ).then((response) => {
    res.send(response.data)
  }).catch((response) => {
    res.send({ error: response.message })
  });
});

console.log(`Listening on ${PORT}`);

app.options('*', cors())

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
