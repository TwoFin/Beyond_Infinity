// pexClientAPI.cjs
// Handles Pexip Infinity ClientAPI (REST) requests
const fetch = require("node-fetch");
const eventSource = require("eventsource");
const vmrMonitor = require("./vmrMonitorClass.cjs")

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

// Simple function to get VMR object classfiication map and default level
async function getClassMap(monitoredVmr) {
  let data = await vmrGet(monitoredVmr.vmrname, monitoredVmr.token, "/get_classification_level");
  monitoredVmr.classMap = data.result.levels;
  monitoredVmr.currentClassLevel = data.result.current;
}

// Check all participants in VMR and change classification to lowest level - used after participat entry/exit
async function checkClassLevel(monitoredVmr) {
  console.info("CLIENT_API: Checking classificaton level for:", monitoredVmr.vmrname);
  let lowLevel = Math.min(...monitoredVmr.participantList.map((p) => p.level));
  if (!isNaN(lowLevel) && lowLevel !== monitoredVmr.currentClassLevel) {
    await changeClassLevel(monitoredVmr.vmrname, monitoredVmr.token, lowLevel);
    monitoredVmr.currentClassLevel = lowLevel;
    console.info("CLIENT_API: Set classification level to:", lowLevel);
  } else {
    console.info("CLIENT_API: No classification level change required");
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
    } else {
      // Check if classificaton level needs to change
      checkClassLevel(monitoredVmr);
    }
    console.debug("DEBUG: Monitored VMRs:", activeVmrList)
  });
}

// Monitor function called by participant policy on participant entry to VMR with classification ANY
async function monitorClassLevel(vmr, participant_uuid, classification) {
  try {
    // Check if VmeMonitor object already exists
    let monitoredVmr = activeVmrList.find((v) => v.vmrname === vmr);
    if (monitoredVmr) {
      /// vmrMonitor instance already in active VMR list
      console.info("CLIENT_API: VMR already monitored");
      monitoredVmr.addParticipant(participant_uuid, classification);
      checkClassLevel(monitoredVmr);
    } else {
      /// Create vmrMonitor instace as not in active VMR list
      console.info("CLIENT_API: VMR not monitored, creating new instance");
      let monitoredVmr = new vmrMonitor(vmr);
      activeVmrList.push(monitoredVmr);
      await vmrEventSource(monitoredVmr);
      await getClassMap(monitoredVmr);
      monitoredVmr.addParticipant(participant_uuid, classification);
      checkClassLevel(monitoredVmr);
    }
    console.debug("DEBUG: Monitored VMRs:", activeVmrList)
  } catch (error) {
    console.error("CLIENT_API:", error);
  }
}

// One time function to check if participant is cleared to enter VMR & set VMR watermark to service_tag param
async function entryByClassLevel(vmr, vmrClass, partClass) {
  let token = await newToken(vmr);
  console.debug(vmr, vmrClass, partClass)
  let data = await vmrGet(vmr, token, "/get_classification_level");
  let classMap = data.result.levels;
  // TODO Finish this off, temp return map for logging
  releaseToken(vmr, token)
  return classMap
}

module.exports = { monitorClassLevel, entryByClassLevel };