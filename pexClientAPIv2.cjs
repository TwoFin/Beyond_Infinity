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

async function releaseToken(vmr, token){
  var response = await fetch(pexnodeapi + vmr + "/release_token", {
    method: "post",
    headers: { token: token },
  });
  var data = await response.json();
  return data;
}

async function vmrGet(vmr, token, path) {
  var response = await fetch(pexnodeapi + vmr + path, {
    headers: { token: token },
  });
  var data = await response.json();
  return data;
}

async function vmrPost(vmr, token, path, json) {
  var response = await fetch(pexnodeapi + vmr + path, {
    method: "post",
    body: JSON.stringify(json),
    headers: { "Content-Type": "application/json", token: token },
  });
  var data = await response.json();
  return data;
}

async function changeClassLevel(vmr, token, level){
  var json = { "level": level };
  var data = await vmrPost(vmr, token, "/set_classification_level", json);
  return data;
}

async function setClassLevel(vmr, classification){
  try {
    console.info("New classificaton:", classification)
    var token = await newToken(vmr);
    var data = await vmrGet(vmr,token, "/get_classification_level")
    var currentLevel = data.result.current;
    var levelMap = data.result.levels;
    console.info("VMR Current classification level:",currentLevel, "- Availible levels:", levelMap)
    var newLevel = Number(
      Object.keys(levelMap).find((e) => levelMap[e] == classification)
    );
    if(newLevel){
      var data = await changeClassLevel(vmr, token, newLevel)
      console.info("Set classification level to:", newLevel, data)
    } else {
      console.warn("Classification does not match VMR levelMap")
    }     
    var releaseResult = await releaseToken(vmr, token)
    console.info("Released token:", releaseResult)
  } catch (error) {
    console.error(error)    
  }
}

async function lowerClassLevel(vmr, classification){
  try {
    console.info("New classificaton:", classification)
    var token = await newToken(vmr);
    var data = await vmrGet(vmr,token, "/get_classification_level")
    var currentLevel = data.result.current;
    var levelMap = data.result.levels;
    console.info("VMR Current classification level:",currentLevel, "- Availible levels:", levelMap)
    var newLevel = Number(
      Object.keys(levelMap).find((e) => levelMap[e] == classification)
    );
    if(newLevel){
      if (newLevel < currentLevel) {
        var data = await changeClassLevel(vmr, token, newLevel)
        console.info("Set classification level to:", newLevel, data)
      } else {
        console.info(
          "No level change required for new level:", newLevel
        );
      }
    } else {
      console.warn("Classification does not match VMR levelMap")
    }     
    var releaseResult = await releaseToken(vmr, token)
    console.info("Released token:", releaseResult)
  } catch (error) {
    console.error(error)    
  }
}

module.exports = {setClassLevel, lowerClassLevel};