// pexClientAPIv3.cjs
// Handles Pexip Infinity ClientAPI (REST) requests
const fetch = require("node-fetch");
const eventSource = require("eventsource");

// Pexip conference node & API ID details from ENV
const pexnodeapi = "https://" + process.env.PEXIP_NODE + "/api/client/v2/conferences/";
const clientapiID = { display_name: process.env.PEXIP_CLIENTAPI_NAME, call_tag: process.env.PEXIP_CLIENTAPI_TAG };

// Global list of monitored/active VMRs
let activeVmrList = [];

// Low Level Pexip ClientAPI functions
async function newToken(vmr) {
  const response = await fetch(pexnodeapi + vmr + "/request_token", {
    method: "post",
    body: JSON.stringify(clientapiID),
    headers: { "Content-Type": "application/json" },
  });
  const data = await response.json();
  if (response.status !== 200){console.warn("CLIENT_API:newToken: Recieved non 200 from ClientAPI:", response.status)};
  return data.result.token;
}

async function refreshToken(vmr, token) {
  const response = await fetch(pexnodeapi + vmr + "/refresh_token", {
    method: "post",
    headers: { token: token },
  });
  const data = await response.json();
  if (response.status !== 200){console.warn("CLIENT_API:refreshToken: Recieved non 200 from ClientAPI:", response.status)};
  return data.result.token;
}

async function releaseToken(vmr, token) {
  let response = await fetch(pexnodeapi + vmr + "/release_token", {
    method: "post",
    headers: { token: token },
  });
  let data = await response.json();
  if (response.status !== 200){console.warn("CLIENT_API:releaseToken: Recieved non 200 from ClientAPI:", response.status)};
  return data;
}

async function vmrGet(vmr, token, path) {
  let response = await fetch(pexnodeapi + vmr + path, {
    headers: { token: token },
  });
  let data = await response.json();
  if (response.status !== 200){console.warn("CLIENT_API:vmrGet: Recieved non 200 from ClientAPI:", response.status)};
  return data;
}

async function vmrPost(vmr, token, path, json) {
  let response = await fetch(pexnodeapi + vmr + path, {
    method: "post",
    body: JSON.stringify(json),
    headers: { "Content-Type": "application/json", token: token },
  });
  let data = await response.json();
  if (response.status !== 200){console.warn("CLIENT_API:vmrPost: Recieved non 200 from ClientAPI:", response.status)};
  return data;
}

// Simple funtion to change VMR classifiction level (number)
async function changeClassLevel(vmr, token, level) {
  let json = { level: level };
  let data = await vmrPost(vmr, token, "/set_classification_level", json);
  return data;
}

// Simple function to set VMR object classfiication map and default level
async function getClassMap(monitoredVmr) {
  let data = await vmrGet(monitoredVmr.vmrname, monitoredVmr.token, "/get_classification_level");
  monitoredVmr.classMap = data.result.levels;
  monitoredVmr.currentClassLevel = data.result.current;
}

// Check all participants in VMR and change classification to lowest level - used after participat entry/exit
async function checkClassLevel(monitoredVmr) {
  console.info("CLIENT_API: Checking classificaton level for:", monitoredVmr.vmrname);
  let lowLevel = Math.min(...monitoredVmr.participantList.map((p) => p.level));
  if (lowLevel !== monitoredVmr.currentClassLevel) {
    await changeClassLevel(monitoredVmr.vmrname, monitoredVmr.token, lowLevel);
    monitoredVmr.currentClassLevel = lowLevel;
    console.info("CLIENT_API: Set classification level to:", lowLevel);
  } else {
    console.info("CLIENT_API: No classification level change required");
  }
}

// VMR Object class (monitoredVmr) to represent monitored/active VMR
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
    let level = Number(Object.keys(this.classMap).find((e) => this.classMap[e] == classification));
    // Add new participant to list
    this.participantList.push({ uuid: uuid, level: level });
  }
  deleleParticipant(uuid) {
    // Remove participant from list
    let partIndex = this.participantList.findIndex((p) => p.uuid === uuid);
    if (partIndex !== -1) {
      this.participantList.splice(partIndex, 1);
    }
  }
}

// VMR EventSource (SSE) used to monitor VMR and manage token
async function vmrEventSource(monitoredVmr) {
  console.info("CLIENT_API: Setting up eventSource to monitor:", monitoredVmr.vmrname);
  // Get token and write back to monitoredVmr
  let token = await newToken(monitoredVmr.vmrname);
  monitoredVmr.token = token;
  // Manage token refresh
  let refeshTokenInterval = setInterval(() => {
    (async () => {
      token = await refreshToken(monitoredVmr.vmrname, token);
      monitoredVmr.token = token;
      console.info("CLIENT_API: Token refreshed for:", monitoredVmr.vmrname);
    })();
  }, 115 * 1000);
  //  Setup eventSource
  let url = pexnodeapi + monitoredVmr.vmrname + "/events?token=" + token;
  let es = new eventSource(url);

  // participant_delete listener
  es.addEventListener("participant_delete", (e) => {
    console.info("CLIENT_API: Participant left:", JSON.parse(e.data));
    monitoredVmr.deleleParticipant(JSON.parse(e.data).uuid);
    // Check if VMR is empty
    if (monitoredVmr.participantList.length === 0) {
      console.info("CLIENT_API: VMR is empty, cleaning up: ", monitoredVmr.vmrname);
      // Release token, clear refresh and remove from active VMR list
      clearInterval(refeshTokenInterval)
      releaseToken(monitoredVmr.vmrname, monitoredVmr.token);
      let vmrIndex = activeVmrList.findIndex((v) => v.vmrname === monitoredVmr.vmrname);
      if (vmrIndex != -1) {
        activeVmrList.splice(vmrIndex, 1);
      }
      console.info
    } else {
      // Check if classificaton level needs to change
      checkClassLevel(monitoredVmr);
    }
  });
}

// Main monitor function called by participant policy on participant entry
async function monitorClassLevel(vmr, participant_uuid, classification) {
  try {
    // Check if VmeMonitor object already exists
    let monitoredVmr = activeVmrList.find((v) => v.vmrname === vmr);
    if (monitoredVmr) {
      /// VmrMonitor instace already in active VMR list
      console.info("CLIENT_API: VMR already monitored");
      monitoredVmr.addParticipant(participant_uuid, classification);
      checkClassLevel(monitoredVmr);
    } else {
      /// Create VmrMonitor instace as not in active VMR list
      console.info("CLIENT_API: VMR not monitored, creating new instance");
      let monitoredVmr = new VmrMonitor(vmr);
      activeVmrList.push(monitoredVmr);
      await vmrEventSource(monitoredVmr);
      await getClassMap(monitoredVmr);
      monitoredVmr.addParticipant(participant_uuid, classification);
      checkClassLevel(monitoredVmr);
    }
  } catch (error) {
    console.error("CLIENT_API:", error);
  }
}

module.exports = { monitorClassLevel };