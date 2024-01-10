//app.js
const http = require("http");
const url = require("url");
const pexParticipantPolicy = require("./pexParticipantPolicy.cjs");
const pexServicePolicy = require("./pexServicePolicy.cjs");

const PORT = process.env.PORT || 5000;

const server = http.createServer(async (req, res) => {
  const pathname = url.parse(req.url).pathname;
  const query = url.parse(req.url, true).query;

  // Check there is query params
  if (Object.keys(query).length === 0) {
    console.warn("APP: No request params, returning 400");
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Bad request" }));
  } else {
    // policy service/configuration request
    if (pathname === "/policy/v1/service/configuration" && req.method === "GET") {
      const pol_response = await pexServicePolicy(query);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(pol_response));
    }
    // policy participant/properties request
    else if (pathname === "/policy/v1/participant/properties") {
      const pol_response = await pexParticipantPolicy(query);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(pol_response));
    }
    // Invalid path
    else {
      console.warn("APP: Invalid path: " + pathname);
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Not found" }));
    }
  }
});

server.listen(PORT, () => {
  console.info(`server started on port: ${PORT}`);
});
