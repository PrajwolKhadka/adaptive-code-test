const { createServer } = require("https");
const { parse } = require("url");
const fs = require("fs");
const next = require("next");

const dev = true;
const app = next({ dev });
const handle = app.getRequestHandler();

const httpsOptions = {
  key: fs.readFileSync("../certs/localhost-key.pem"),
  cert: fs.readFileSync("../certs/localhost-cert.pem"),
};

app.prepare().then(() => {
  createServer(httpsOptions, (req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(3000, () => {
    console.log(
      "Frontend running at https://localhost:3000"
    );
  });
});