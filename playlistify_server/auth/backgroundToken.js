async function getToken() {
  const response = await axios.post('https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(process.env.REACT_APP_CLIENT_ID + ':' + process.env.REACT_APP_CLIENT_SECRET)
      }
    }
  ).then(async (response) => {
    return response.data.access_token
  }).catch((response) => {
    throw new Error(`Error! status: ${response.status}`);
  })
  return response
}

export default getToken
