// vmrMonitor.cjs
// VMR class and functions to monitor active VMRs and dynamiclly change on participant entry/exit

class VmrMonitor {
    constructor(vmr) {
      this.vmrname = vmr;
      this.participantList = [];
      this.token;
      this.classMap;
      this.currentClassLevel;
    }
    addParticipant(uuid, classification) {
      // Map classification to level if classifiction supplied
      let level = this.currentClassLevel;
      if (classification){
        level = Number(Object.keys(this.classMap).find((e) => this.classMap[e] == classification));
      }
      // Set Level to 0 if no match on classification name
      if(isNaN(level)){level = 0};
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

module.exports = VmrMonitor;