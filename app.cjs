//app.js
const http = require("http");
const url = require("url");
const pexParticipantPolicy = require("./VMR_IDP_Classification/pexParticipantPolicy.cjs");
const pexServicePolicy = require("./VMR_IDP_Classification/pexServicePolicy.cjs");

const PORT = process.env.PORT || 5000;

const server = http.createServer(async (req, res) => {
  const pathname = url.parse(req.url).pathname;
  const query = url.parse(req.url, true).query;
  
  if (req.method === "GET" && Object.keys(query).length !== 0 ){
    // Request is GET and has query parameters

    // policy service/configuration request
    if (pathname === "/policy/v1/service/configuration") {
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
      console.warn("APP: Invalid path:", pathname);
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Not found" }));
    }

  } else {
    // Bad request
    console.warn("APP: Bad request");
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Bad request" }));
  }
});

server.listen(PORT, () => {
  console.info(`server started on port: ${PORT}`);
});
