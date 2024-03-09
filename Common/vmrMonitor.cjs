// vmrMonitor.cjs
// VMR class and functions to monitor active VMRs and dynamiclly change on participant entry/exit

// Imports, config & ENV
const clientAPI = require("./pexClientAPI.cjs");
const eventSource = require("eventsource");
const pexnodeapi = "https://" + process.env.PEXIP_NODE + "/api/client/v2/conferences/";

// List of monitored/active VMRs
let activeVmrList = [];

// VMR monitor function called by participant policy on participant entry to VMR
async function monitorVmr(vmr, participant_uuid, classification) { // TODO- except query here?
  try {
    // Check if vmrMonitor object already exists
    let monitoredVmr = activeVmrList.find((v) => v.vmrname === vmr);
    if (monitoredVmr) {
      /// vmrMonitor instance already in active VMR list
      console.info("vmrMonitor: VMR already monitored");
      monitoredVmr.addParticipant(participant_uuid, classification);
    } else {
      /// Create vmrMonitor instace as not in active VMR list
      console.info("vmrMonitor: VMR not monitored, creating new instance");
      let monitoredVmr = new vmrMonitor(vmr, participant_uuid, classification);
      activeVmrList.push(monitoredVmr);
    }
  } catch (error) {
    console.error("vmrMonitor:", error);
  }
}

// VMR monitor object class
class vmrMonitor {
  constructor(vmr, participant_uuid, classification) {
    this.vmrname = vmr;
    this.participantList = [];
    this.token;
    this.monitorClassification;
    this.classMap;
    this.currentClassLevel;
    // setup clientAPI & Eventsource
    vmrMonitorSetup(this, participant_uuid, classification);

  }
  addParticipant(uuid, classification) {
    // Map classification to level if classifiction supplied
    let level = this.currentClassLevel;
    if (classification) {
      level = Number(Object.keys(this.classMap).find((e) => this.classMap[e] == classification));
    }
    // Set Level to 0 if no match on classification name
    if (isNaN(level)) { level = 0 };
    // Add new participant to list
    this.participantList.push({ uuid: uuid, level: level });
    // Check new class level
    checkClassLevel(this);
  }
  deleleParticipant(uuid) {
    // Remove participant from list
    let partIndex = this.participantList.findIndex((p) => p.uuid === uuid);
    if (partIndex !== -1) {
      this.participantList.splice(partIndex, 1);
    }
  }
}

// VMR EventSource (SSE) used to monitor VMR and manage token - maybe move back to client API?
async function vmrMonitorSetup(monitoredVmr, participant_uuid, classification) {
  // Get token and write back to monitoredVmr
  let token = await clientAPI.newToken(monitoredVmr.vmrname);
  monitoredVmr.token = token;
  // Manage token refresh
  let refeshTokenInterval = setInterval(() => {
    (async () => {
      token = await clientAPI.refreshToken(monitoredVmr.vmrname, token);
      monitoredVmr.token = token;
      console.info("vmrMonitor: Token refreshed for:", monitoredVmr.vmrname);
    })();
  }, 115 * 1000);

  // Populate class map
  await getClassMap(monitoredVmr);
  // Add first participant
  monitoredVmr.addParticipant(participant_uuid, classification)
  // Log new monitoredVmr 
  console.info("vmrMonitor: New VMR monitor created:", monitoredVmr.vmrname)

  //  Setup eventSource
  let url = pexnodeapi + monitoredVmr.vmrname + "/events?token=" + token;
  let es = new eventSource(url);

  // participant_delete listener
  es.addEventListener("participant_delete", (e) => {
    console.info("vmrMonitor: Participant left:", JSON.parse(e.data));
    monitoredVmr.deleleParticipant(JSON.parse(e.data).uuid);
    // Check if VMR is empty
    if (monitoredVmr.participantList.length === 0) {
      console.info("vmrMonitor: VMR is empty, cleaning up: ", monitoredVmr.vmrname);
      // Release token, clear refresh and remove from active VMR list
      clearInterval(refeshTokenInterval)
      clientAPI.releaseToken(monitoredVmr.vmrname, monitoredVmr.token);
      let vmrIndex = activeVmrList.findIndex((v) => v.vmrname === monitoredVmr.vmrname);
      if (vmrIndex != -1) {
        activeVmrList.splice(vmrIndex, 1);
      }
    } else {
      // Check if classificaton level needs to change
      checkClassLevel(monitoredVmr);
    }
  });
}

// Populate class map into vmr instance 
async function getClassMap(monitoredVmr) {
  let classMap = await clientAPI.getClassMap(monitoredVmr.vmrname, monitoredVmr.token);
  monitoredVmr.classMap = classMap.levels;
  monitoredVmr.currentClassLevel = classMap.current;  
}

// Check all participants in VMR and change classification to lowest level
async function checkClassLevel(monitoredVmr) {
  console.info("vmrMonitor: Checking classificaton level for:", monitoredVmr.vmrname);
  let lowLevel = Math.min(...monitoredVmr.participantList.map((p) => p.level));
  if (!isNaN(lowLevel) && lowLevel !== monitoredVmr.currentClassLevel) {
    await clientAPI.changeClassLevel(monitoredVmr.vmrname, monitoredVmr.token, lowLevel);
    monitoredVmr.currentClassLevel = lowLevel;
    console.info("vmrMonitor: Set classification on: ", monitoredVmr.vmrname, " to:", lowLevel);
  } else {
    console.info("vmrMonitor: No classification level change required for", monitoredVmr.vmrname);
  }
}

module.exports = monitorVmr;