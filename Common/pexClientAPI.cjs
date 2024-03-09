// pexClientAPI.cjs
// Handles Pexip Infinity ClientAPI (REST) requests

//Imports and settings
const fetch = require("node-fetch");
const pexnodeapi = "https://" + process.env.PEXIP_NODE + "/api/client/v2/conferences/";
const clientApiID = { display_name: process.env.PEXIP_CLIENTAPI_NAME, call_tag: process.env.PEXIP_CLIENTAPI_TAG };

// Token handles
async function newToken(vmr) {
  const response = await fetch(pexnodeapi + vmr + "/request_token", {
    method: "post",
    body: JSON.stringify(clientApiID),
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  if (response.status !== 200) { console.warn("CLIENT_API:newToken: Recieved non 200 from ClientAPI:", response.status) };
  return data.result.token;
}

async function refreshToken(vmr, token) {
  const response = await fetch(pexnodeapi + vmr + "/refresh_token", {
    method: "post",
    headers: { token: token },
  });
  const data = await response.json();
  if (response.status !== 200) { console.warn("CLIENT_API:refreshToken: Recieved non 200 from ClientAPI:", response.status) };
  return data.result.token;
}

async function releaseToken(vmr, token) {
  let response = await fetch(pexnodeapi + vmr + "/release_token", {
    method: "post",
    headers: { token: token },
  });
  let data = await response.json();
  if (response.status !== 200) { console.warn("CLIENT_API:releaseToken: Recieved non 200 from ClientAPI:", response.status) };
  return data;
}

// Low Level Pexip ClientAPI functions
async function vmrGet(vmr, token, path) {
  let response = await fetch(pexnodeapi + vmr + path, {
    headers: { token: token },
  });
  let data = await response.json();
  if (response.status !== 200) { console.warn("CLIENT_API:vmrGet: Recieved non 200 from ClientAPI:", response.status) };
  return data;
}

async function vmrPost(vmr, token, path, json) {
  let response = await fetch(pexnodeapi + vmr + path, {
    method: "post",
    body: JSON.stringify(json),
    headers: { "Content-Type": "application/json", token: token },
  });
  let data = await response.json();
  if (response.status !== 200) { console.warn("CLIENT_API:vmrPost: Recieved non 200 from ClientAPI:", response.status) };
  return data;
}

// Function to get VMR classfiication map and current level
async function getClassMap(vmr, token) {
  let data = await vmrGet(vmr, token, "/get_classification_level");
  return data.result;
}

// Funtion to change VMR classifiction level (number)
async function changeClassLevel(vmr, token, level) {
  let json = { level: level };
  let data = await vmrPost(vmr, token, "/set_classification_level", json);
  return data;
}

module.exports = { newToken, refreshToken, releaseToken, getClassMap, changeClassLevel };