const fetch = require("node-fetch");
const eventSource = require("eventsource");

const pexnodeapi = "https://" + process.env.PEXIP_NODE + "/api/client/v2/conferences/";
const clientapiID = { display_name: process.env.PEXIP_CLIENTAPI_NAME, call_tag: process.env.PEXIP_CLIENTAPI_TAG };
let activeVmrList = [];

class VmrMonitor {
  constructor(vmr) {
    this.vmrname = vmr;
    this.participantList = [];
    this.token;
    this.classMap;
    this.currentClassLevel;
  }

  addParticipant(uuid, classification) {
    // Map classification to level
    let level = Number(
      Object.keys(this.classMap).find((e) => this.classMap[e] == classification)
    );
    // Add new participant to list
    this.participantList.push({ uuid: uuid, level: level});
  }

  deleleParticipant(uuid) {
    // Remove participant from list
    let partIndex = this.participantList.findIndex((p) => p.uuid === uuid);
    if (partIndex !== -1) {
      this.participantList.splice(partIndex, 1);
    }
  }
}

async function vmrEventSource(monitoredVmr){
  console.info("PEXCLIENTAPI: Setting up eventSource to monitor:", monitoredVmr.vmrname)
  
  // Get token and write back to monitoredVmr
  let token = await newToken(monitoredVmr.vmrname);
  monitoredVmr.token = token;
  
  // Manage token refresh - TODO put after es and mange destroy
  setInterval(() => {
    (async () => {
      token = await refreshToken(monitoredVmr.vmrname, token);
      monitoredVmr.token = token;
      console.info("PEXCLIENTAPI: Token refreshed for:", monitoredVmr.vmrname)
    })();
  }, 115 * 1000);

  //  Setup eventSource
  let url = pexnodeapi + monitoredVmr.vmrname + "/events?token=" + token;
  let es = new eventSource(url);
  // participant_delete listerner
  es.addEventListener("participant_delete", (e) => {
    console.info("PEXCLIENTAPI: Participant left:", JSON.parse(e.data));
    monitoredVmr.deleleParticipant(JSON.parse(e.data).uuid);
    // Check if VMR is empty
    if (monitoredVmr.participantList.length === 0){ 
      console.info("PEXCLIENTAPI: VMR is empmty, cleaning up")
      // Release token and remove from active VMR list
      releaseToken(monitoredVmr.vmrname, monitoredVmr.token);
      let vmrIndex = activeVmrList.findIndex((v) => v.vmrname === monitoredVmr.vmrname);
      if (vmrIndex != -1){
        activeVmrList.splice(vmrIndex, 1);
      }      
    } else {
      // Check if classificaton level needs to change 
      checkClassLevel(monitoredVmr);
    }
  });      
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

async function getClassMap(monitoredVmr){
  let data = await vmrGet(monitoredVmr.vmrname, monitoredVmr.token, "/get_classification_level");
  monitoredVmr.classMap = data.result.levels;
  monitoredVmr.currentClassLevel = data.result.current;
}

async function changeClassLevel(vmr, token, level){
  let json = { "level": level };
  let data = await vmrPost(vmr, token, "/set_classification_level", json);
  return data;
}

// Check all participants in VMR and change classification to lowest level
async function checkClassLevel(monitoredVmr){
  console.info("PEXCLIENTAPI: Checking classificaton level for:", monitoredVmr.vmrname);
  let lowLevel = Math.min(...monitoredVmr.participantList.map((p) => p.level));
  if (lowLevel !== monitoredVmr.currentClassLevel){
    await changeClassLevel(monitoredVmr.vmrname, monitoredVmr.token, lowLevel);
    monitoredVmr.currentClassLevel = lowLevel
    console.info("PEXCLIENTAPI: Set classification level to:", lowLevel);
  } else {
    console.info("PEXCLIENTAPI: No classification level change required");
  }
}

async function monitorClassLevel(vmr, participant_uuid, classification){
  try {
    let monitoredVmr = activeVmrList.find((v) => v.vmrname === vmr)
    if (monitoredVmr){
      /// VmrMonitor instace already in active VMR list
      console.info('PEXCLIENTAPI: VMR already monitored');
      monitoredVmr.addParticipant(participant_uuid, classification);
      checkClassLevel(monitoredVmr);

    } else {
      /// Create VmrMonitor instace as not in active VMR list
      console.info('PEXCLIENTAPI: VMR not monitored, creating new instance');
      let monitoredVmr = new VmrMonitor(vmr);
      activeVmrList.push(monitoredVmr);
      await vmrEventSource(monitoredVmr);
      await getClassMap(monitoredVmr);
      monitoredVmr.addParticipant(participant_uuid, classification);
      checkClassLevel(monitoredVmr);     
    }

  } catch (error) {
    console.error("PEXCLIENTAPI:", error)    
  }
}

module.exports = {monitorClassLevel};
