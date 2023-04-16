// server/index.js
require('dotenv').config()

const express = require("express");
const getToken = require("./auth/backgroundToken")

const PORT = process.env.PORT || 3001;

const app = express();

app.get("/token", (req, res) => {
  res.json({ message: "Hello from server!" });
});

app.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
