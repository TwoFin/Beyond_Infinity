const fetch = require("node-fetch");

const pexnodeapi = "https://" + process.env.PEXIP_NODE + "/api/client/v2/conferences/";
const clientapiID = { display_name: process.env.PEXIP_CLIENTAPI_NAME, call_tag: process.env.PEXIP_CLIENTAPI_TAG };

async function newToken(vmr) {
  const response = await fetch(pexnodeapi + vmr + "/request_token", {
    method: "post",
    body: JSON.stringify(clientapiID),
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  return data.result.token;
}

async function newTokenFull(vmr) {
  const response = await fetch(pexnodeapi + vmr + "/request_token", {
    method: "post",
    body: JSON.stringify(clientapiID),
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  return data.result;
}

async function refreshToken(vmr, token) {
  const response = await fetch(pexnodeapi + vmr + "/refresh_token", {
    method: "post",
    headers: { token: token },
  });
  const data = await response.json();
  return data.result.token;
}

async function releaseToken(vmr, token){
  let response = await fetch(pexnodeapi + vmr + "/release_token", {
    method: "post",
    headers: { token: token },
  });
  let data = await response.json();
  return data;
}

async function vmrGet(vmr, token, path) {
  let response = await fetch(pexnodeapi + vmr + path, {
    headers: { token: token },
  });
  let data = await response.json();
  return data;
}

async function vmrPost(vmr, token, path, json) {
  let response = await fetch(pexnodeapi + vmr + path, {
    method: "post",
    body: JSON.stringify(json),
    headers: { "Content-Type": "application/json", token: token },
  });
  let data = await response.json();
  return data;
}

async function changeClassLevel(vmr, token, level){
  let json = { "level": level };
  let data = await vmrPost(vmr, token, "/set_classification_level", json);
  return data;
}

async function setClassLevel(vmr, classification){
  try {
    console.info("PEXCLIENTAPI: New classificaton:", classification)
    let token = await newToken(vmr);
    let data = await vmrGet(vmr,token, "/get_classification_level")
    let currentLevel = data.result.current;
    let levelMap = data.result.levels;
    console.info("PEXCLIENTAPI: VMR Current classification level:",currentLevel, "- Availible levels:", levelMap)
    let newLevel = Number(
      Object.keys(levelMap).find((e) => levelMap[e] == classification)
    );
    if(newLevel){
      let data = await changeClassLevel(vmr, token, newLevel)
      console.info("PEXCLIENTAPI: Set classification level to:", newLevel, data)
    } else {
      console.warn("PEXCLIENTAPI: Classification does not match VMR levelMap")
    }     
    let releaseResult = await releaseToken(vmr, token)
    console.info("PEXCLIENTAPI: Released token:", releaseResult)
  } catch (error) {
    console.error("PEXCLIENTAPI:", error)    
  }
}

async function lowerClassLevel(vmr, classification){
  try {
    console.info("PEXCLIENTAPI: New classificaton:", classification)
    let token = await newToken(vmr);
    let data = await vmrGet(vmr,token, "/get_classification_level")
    let currentLevel = data.result.current;
    let levelMap = data.result.levels;
    console.info("PEXCLIENTAPI: VMR Current classification level:",currentLevel, "- Availible levels:", levelMap)
    let newLevel = Number(
      Object.keys(levelMap).find((e) => levelMap[e] == classification)
    );
    if(newLevel){
      if (newLevel < currentLevel) {
        let data = await changeClassLevel(vmr, token, newLevel)
        console.info("PEXCLIENTAPI: Set classification level to:", newLevel, data)
      } else {
        console.info("PEXCLIENTAPI: No level change required for new level:", newLevel
        );
      }
    } else {
      console.warn("PEXCLIENTAPI: Classification does not match VMR levelMap")
    }     
    let releaseResult = await releaseToken(vmr, token)
    console.info("PEXCLIENTAPI: Released token:", releaseResult)
  } catch (error) {
    console.error("PEXCLIENTAPI:", error)    
  }
}

module.exports = {setClassLevel, lowerClassLevel, newTokenFull};
