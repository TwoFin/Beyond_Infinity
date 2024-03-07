// Imports & config
const clientAPI = require("../Common/pexClientAPI.cjs");
const displayNameBuild = require("../Common/displayNameBuild.cjs");

const config = require("./config.json");

// Set lists for IDP processing from configuration file - TOFO thiese may not be required with new service_tag method
const idpAttrs = config.idpAttrs;
const rankTop = config.rankTop;
const rankCo = config.rankCo;

async function idpControl(tag_params, query, pol_response) {
  console.info("idpControl: Recieved request for service_tag: ", tag_params);

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
  console.info("idpControl: Participant classification level is:", query.idp_attribute_clearance);
  if (tag_params[3] !== "ANY") {
    // Allow VMR entry based on participants clearance level
    partLevel = Number(Object.keys(config.classificationLevels).find((e) => config.classificationLevels[e] == query.idp_attribute_clearance));
    vmrLevel = Number(Object.keys(config.classificationLevels).find((e) => config.classificationLevels[e] == tag_params[3]));
    if (partLevel < vmrLevel) {
      console.warn("idpControl: Participant does not have clearance for this VMR:", query.idp_attribute_clearance);
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
      console.info("idpControl: Using ClientAPI to monitor VMR: ", query.service_name);
      clientAPI.monitorClassLevel(query.service_name, query.participant_uuid, query.idp_attribute_clearance);
    }
  }

  // Return resuling policy response
  return pol_response
}

module.exports = idpControl;