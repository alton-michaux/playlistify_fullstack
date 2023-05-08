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
const profile_endpoint = process.env.PROFILE_ENDPOINT;
const token_endpoint = process.env.TOKEN_ENDPOINT
const PORT = process.env.PORT;

const app = express();

app.use(express.static(__dirname + '/public'))
app.use(cors())
app.use(cookieParser())

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, DELETE, OPTIONS');
  next();
});

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

  const code = queryParams.get('code');
  const state = queryParams.get('state');

  if ((state) === null) {
    res.send({ error: 'state_mismatch' })
  }

  const body = 'grant_type=authorization_code'

  const options = {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': body.length,
      'Authorization': Buffer.from(`${client_id}:${client_secret}`, 'utf-8').toString('base64')
    },
    params: {
      code: code,
      redirect_uri: redirect_uri,
      grant_type: 'authorization_code'
    },
    body: body
  }

  axios.post(token_endpoint, {}, {
    headers: options.headers,
    params: options.params,
    body: options.body
  }).then(response => {
    console.log("🚀 ~ file: index.js:195 ~ response:", response)
    const accessToken = response.data.access_token,
      refreshToken = response.data.refresh_token

    const userHeaders = {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${access_token}`
    }

    const userData = {
      access_token: accessToken,
      refresh_token: refreshToken
    }

    axios.get(profile_endpoint, userData, {
      headers: userHeaders
    }).then(response => {
      console.log("🚀 ~ file: index.js:212 ~ response:", response)
      res.send(response)
    }).catch(err => {
      console.log("🚀 ~ file: index.js:213 ~ err:", err)
      res.send({ error: err.message })
    })
  }).catch(err => {
    console.log("🚀 ~ file: index.js:212 ~ err:", err)
    res.send({ error: err.message })
  })
});

//   axios({
//     url: token_endpoint,
//     method: 'post',
//     params: {
//       code: code,
//       redirect_uri: redirect_uri,
//       grant_type: 'authorization_code'
//     },
//     headers: {
//       'Accept': 'application/json',
//       'Content-Type': 'application/x-www-form-urlencoded'
//     },
//     auth: {
//       username: client_id,
//       password: client_secret
//     }
//   }).then(response => {
//     console.log("🚀 ~ file: index.js:196 ~ response:", response)

//     const accessToken = response.data.access_token,
//       refreshToken = response.data.refresh_token

//     axios({
//       url: profile_endpoint,
//       headers: {
//         'Accept': 'application/json',
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//       params: {
//         access_token: accessToken,
//         refresh_token: refreshToken
//       }
//     }).then(response => {
//       console.log("🚀 ~ file: index.js:212 ~ response:", response)
//       res.redirect('/#' + qs.stringify({
//         access_token: accessToken,
//         refresh_token: refreshToken
//       }))
//     }).catch(err => {
//       console.log("🚀 ~ file: index.js:218 ~ err:", err)
//       res.redirect('/#' + qs.stringify({
//         error: 'invalid token'
//       }))
//       console.log(err)
//     })
//   }).catch(err => {
//     console.log(err)
//   })
// });

console.log(`Listening on ${PORT}`);

app.options('*', cors())

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
