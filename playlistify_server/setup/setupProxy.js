const proxy = require("http-proxy-middleware");
const morgan = require("morgan");

module.exports = app => {
  app.use(
    "/api",
    proxy({
      target: "http://localhost:3000",
      changeOrigin: true
    })
  );

  app.use(morgan('combined'));
};
