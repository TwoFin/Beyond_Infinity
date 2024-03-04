// Imports
const clientAPI = require("../Common/pexClientAPI.cjs");
const config = require("./config.json");

// Set lists for IDP processing from configuration file
const idpAttrs = config.idpAttrs;
const rankTop = config.rankTop;
const rankCo = config.rankCo;

function vmrTreatment(tag_params, query, pol_response) {
  console.debug("idpControl: Query: ", query)
  console.debug("idpControl: Recieved request for service_tag: ", tag_params, pol_response) 
  // Check for known service_tag treatments
  switch (true) {
    // "AllDept" tag - continue
    case tag_params[0] === "allDept": {
      console.info("idpControl: allDept service_tag, default continue");
      break;
    }
    // "rank" tag - entry condition based on rank lists from pexPolicyConfig
    case tag_params[0] === "rank": {
      if (tag_params[1] === "co" && rankCo.includes(query.idp_attribute_jobtitle)) {
        // CO Memeber
        console.info("idpControl: Participants idp jobtitle is on CO list OK");
      } else if (tag_params[1] === "top" && rankTop.includes(query.idp_attribute_jobtitle)) {
        // Top Member
        console.info("idpControl: Participants idp jobtitle is on TOP list OK");
      } else {
        // Not in any rank list
        console.warn("idpControl: Participants idp jobtitle NOT in any rank list, response:");
        pol_response.action = "reject";
        pol_response["result"] = {"reject_reason": "ACCESS DENIED You do not have the required rank" };
      }
      break;
    }
    // Entry condition based on idp attribute/value match from idpAttr list
    case idpAttrs.includes(tag_params[0]): {
      if (query["idp_attribute_" + tag_params[0]] === tag_params[1]) {
        console.info("idpControl: Participants idp attribute matches service_tag OK");
      } else {
        console.warn("idpControl: Participants idp attribute does NOT match service_tag, response:");
        pol_response.action = "reject";
        pol_response["result"] = {"reject_reason": "ACCESS DENIED You are not in: " + tag_params[1] };
      }
      break;
    }

    // Default response
    default: {
      console.info("idpControl: service_tag does not match any treatments, default continue");
    }
  }
  // If action is continue build disply name and set up VMR monitor
  if (pol_response.action === "continue") {
    // If IDP attributes are present, build overlay text
    if (query.idp_attribute_jobtitle && query.idp_attribute_surname && query.idp_attribute_department) {
      pol_response.result = {
        remote_display_name: query.idp_attribute_jobtitle + " " + query.idp_attribute_surname + " | " + query.idp_attribute_department,
      };
      console.info("idpControl: Display name updated: ", pol_response.result.remote_display_name);
    } else {
      console.warn("idpControl: Display name not updated due lack of idp attributes: ", query.idp_attribute_jobtitle, query.idp_attribute_surname, query.idp_attribute_department);
    }

    // Set up VMR Monitor for classification
    console.info("idpControl: Using ClientAPI to monitor VMR classification: ", query.service_name);
    clientAPI.monitorClassLevel(query.service_name, query.participant_uuid, query.idp_attribute_clearance);
  }
  // Return resuling policy response
  return pol_response;
}

module.exports = vmrTreatment;