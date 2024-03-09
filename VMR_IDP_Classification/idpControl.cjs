// idpContol.cjs
//  Controls VMR entry based on participants IDP settings & VMR service_tag

// Imports & config
const monitorVmr = require("../Common/vmrMonitor.cjs");
const displayNameBuild = require("../Common/displayNameBuild.cjs");
const config = require("./config.json");

async function idpControl(tag_params, query, pol_response) {
  console.info("idpControl: Recieved request for vmr: ", query.service_name, ", tag params:", tag_params);

  // Check if entry control by IDP attribute is required
  console.info("idpControl: Processing VMR entry based on IDP Attr/Value: ", tag_params[1], tag_params[2]);
  if (tag_params[1] !== "ANY") {    
    if (query["idp_attribute_" + tag_params[1]] === tag_params[2]) {
      console.info("idpControl: Participants idp attribute matches service_tag OK");
    } else {
      console.warn("idpControl: Participants idp attribute does NOT match service_tag");
      pol_response.action = "reject";
      pol_response["result"] = { "reject_reason": "ACCESS DENIED. You are not a member of: " + tag_params[2] };
    }
  }

  // Check if classification level is required
  console.info("idpControl: VMR classification level is:", tag_params[3]);
  if (tag_params[3] !== "ANY" && pol_response.action === "continue") {
    // Allow VMR entry based on participants clearance level
    console.info("idpControl: Participant classification level is:", query.idp_attribute_clearance);
    partLevel = Number(Object.keys(config.classificationLevels).find((e) => config.classificationLevels[e] == query.idp_attribute_clearance));
    vmrLevel = Number(Object.keys(config.classificationLevels).find((e) => config.classificationLevels[e] == tag_params[3]));
    console.info("idpControl: |Participant level:", partLevel, "|VMR level:", vmrLevel )
    if (partLevel < vmrLevel || isNaN(partLevel)) {
      console.warn("idpControl: Participant does not have clearance for this VMR with:", query.idp_attribute_clearance);
      pol_response.action = "reject";
      pol_response["result"] = { "reject_reason": "ACCESS DENIED. You do not have the required clearance" };
    }
  }

  // If action is continue build disply name. If classification level is ANY, set up vmrMonitor for dynamic watermark
  if (pol_response.action === "continue") {
    let displayName = displayNameBuild(query)
    pol_response.result = {
      remote_display_name: displayName,
    };
    if (tag_params[3] === "ANY") {
      console.info("idpControl: Setting up vmr monitor for: ", query.service_name);
      monitorVmr(query.service_name, query.participant_uuid, query.idp_attribute_clearance);
    }
  }

  // Return resuling policy response
  return pol_response
}

module.exports = idpControl;