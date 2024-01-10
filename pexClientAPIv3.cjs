const fetch = require("node-fetch");

const pexnodeapi = "https://" + process.env.PEXIP_NODE + "/api/client/v2/conferences/";
const clientapiID = { display_name: process.env.PEXIP_CLIENTAPI_NAME, call_tag: process.env.PEXIP_CLIENTAPI_TAG };
let activeVmrList = [];

class VmrMonitor {
  constructor(vmr, participant_uuid, classification) {
    this.vmrname = vmr;
    this.participantList = [];
    this.tokenFull = null;
    this.token = null;
    // TODO decide on whole object or just name
    // activeVmrList.push(this.vmrname);
  }

  async getToken(){
    this.tokenFull = await pexClientAPI.newTokenFull(this.vmrname)
  }

  addParticipant(uuid, level, isBot) {
    this.participantList.push({ uuid: uuid, level: level, isBot: isBot });
    // Classification logic here
  }

  deleleParticipant(uuid) {
    // Remove participant
    let partIndex = this.participantList.findIndex((p) => p.uuid === uuid);
    if (partIndex !== -1) {
      this.participantList.splice(partIndex, 1);
    }
    // Check if only MeetBot left in vmr
    if (this.participantList.length === 1) {
      console.log("Only 1 participant left, checking if MeetBot");
      let botIndex = this.participantList.findIndex((p) => p.isBot === true);
      if (botIndex !== -1) {
        console.log("Last participant is MeetBot so removing");
        this.participantList.splice(partIndex, 1);
        // Release Token
      }
    }  
    // Clean up vmr instance if empty
    if (this.participantList.length === 0) {
      // Destroy vmr class
      let vmrListIndex = activeVmrList.findIndex((v) => v === this.vmrname);
      if (vmrListIndex !== -1) {
        activeVmrList.splice(vmrListIndex, 1);
      }
      delete this;
    }    
  }
}

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

async function monitorClassLevel(vmr, participant_uuid, classification){
  try {
    console.info("PEXCLIENTAPI: Classification monitor request for:", vmr)

    if (activeVmrList.find((v) => v.vmrname === vmr)){
      /// VmrMonitor instace already in active VMR list
      console.log('PEXCLIENTAPI: VMR already monitored');
      let monitoredVmr = activeVmrList.find((v) => v.vmrname === vmr);
      monitoredVmr.addParticipant(participant_uuid, classification, false);
      lowerClassLevel(vmr, classification);

    } else {
      /// Creating VmrMonitor instace as not in active VMR list
      console.log('PEXCLIENTAPI: VMR not monitored creating new instance');
      activeVmrList.push(new VmrMonitor(vmr, participant_uuid, classification));
      let monitoredVmr = activeVmrList.find((v) => v.vmrname === vmr);
      monitoredVmr.addParticipant(participant_uuid, classification, false);
      lowerClassLevel(vmr, classification);     
    }

    console.log("PEXCLIENTAPI: Current active VMR list", activeVmrList)

  } catch (error) {
    console.error("PEXCLIENTAPI:", error)    
  }
}

module.exports = {setClassLevel, monitorClassLevel, lowerClassLevel, newTokenFull};
