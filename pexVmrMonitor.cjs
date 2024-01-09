const pexClientAPI = require("./pexClientAPIv3.cjs");
const eventSource = require("eventsource");

const activeVmrList = [];

class VmrMonitor {
  constructor(vmr) {
    this.vmrname = vmr;
    this.participantList = [];
    this.tokenFull = null;
    this.token = null;
    // TODO decide on whole object or just name
    activeVmrList.push(this.vmrname);
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

module.exports = {VmrMonitor}