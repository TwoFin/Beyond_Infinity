// Imports
const clientAPI = require("../Common/pexClientAPI.cjs");
const config = require("./config.json");

// Set lists for IDP processing from configuration file
const idpAttrs = config.idpAttrs;
const rankTop = config.rankTop;
const rankCo = config.rankCo;

function vmrTreatment(tag_params, query, pol_response) {
console.debug("VMR_TREATMENTS: Recieved request for service_tag: ", tag_params, pol_response) 
  // Check for known service_tag treatments
  switch (true) {
    // "AllDept" tag - continue
    case tag_params[0] === "allDept": {
      console.info("VMR_TREATMENTS: allDept service_tag, default continue");
      break;
    }
    // "rank" tag - entry condition based on rank lists from pexPolicyConfig
    case tag_params[0] === "rank": {
      if (tag_params[1] === "co" && rankCo.includes(query.idp_attribute_jobtitle)) {
        // CO Memeber
        console.info("VMR_TREATMENTS: Participants idp jobtitle is on CO list OK");
      } else if (tag_params[1] === "top" && rankTop.includes(query.idp_attribute_jobtitle)) {
        // Top Member
        console.info("VMR_TREATMENTS: Participants idp jobtitle is on TOP list OK");
      } else {
        // Not in any rank list
        console.warn("VMR_TREATMENTS: Participants idp jobtitle NOT in any rank list, response:");
        pol_response.action = "reject";
        pol_response["result"] = {"reject_reason": "ACCESS DENIED You do not have the required rank" };
      }
      break;
    }
    // Entry condition based on idp attribute/value match from idpAttr list
    case idpAttrs.includes(tag_params[0]): {
      if (query["idp_attribute_" + tag_params[0]] === tag_params[1]) {
        console.info("VMR_TREATMENTS: Participants idp attribute matches service_tag OK");
      } else {
        console.warn("VMR_TREATMENTS: Participants idp attribute does NOT match service_tag, response:");
        pol_response.action = "reject";
        pol_response["result"] = {"reject_reason": "ACCESS DENIED You are not in: " + tag_params[1] };
      }
      break;
    }

    // Default response
    default: {
      console.info("VMR_TREATMENTS: service_tag does not match any treatments, default continue");
    }
  }
  // If action is continue build disply name and set up VMR monitor
  if (pol_response.action === "continue") {
    // If IDP attributes are present, built overlay text
    if (query.idp_attribute_jobtitle && query.idp_attribute_surname && query.idp_attribute_department) {
      pol_response.result = {
        remote_display_name: query.idp_attribute_jobtitle + " " + query.idp_attribute_surname + " | " + query.idp_attribute_department,
      };
      console.info("VMR_TREATMENTS: Display name updated: ", pol_response.result.remote_display_name);
    }

    // Set up VMR Monitor for classification
    console.info("VMR_TREATMENTS: Using ClientAPI to monitor VMR classification: ", query.service_name);
    clientAPI.monitorClassLevel(query.service_name, query.participant_uuid, query.idp_attribute_clearance);
  }
  // Return resuling policy response
  return pol_response;
}

module.exports = vmrTreatment;