// pexParticipant.cjs
// Handles Pexip Infinity external policy 'Participant properties' requests

// pexClientApi import and ClientAPI ID setting from ENV;
const clientAPI = require("./pexClientAPIv3.cjs");
const clientapi_name = process.env.PEXIP_CLIENTAPI_NAME;
const clientapi_tag = process.env.PEXIP_CLIENTAPI_TAG;

// Import policy configuration file
const pexpolicyConfig = require("./pexPolicyConfig.json");
// Set lists for IDP processing from configuration file
const idpAttrs = pexpolicyConfig.idpAttrs;
const rankTop = pexpolicyConfig.rankTop;
const rankCo = pexpolicyConfig.rankCo;

// default policy responses
const pol_reject = {
  status: "success",
  action: "reject",
};
const pol_reject_msg = {
  status: "success",
  action: "reject",
  result: { reject_reason: "ACCESS DENIED" },
};
const pol_continue = {
  status: "success",
  action: "continue",
};

async function participantPropPol(query) {
  // Copy default responses in local scope - prevents old data from previous function call
  const pol_response = Object.assign({}, pol_continue);
  const pol_response_reject = Object.assign({}, pol_reject_msg);

  // ClientAPI bypass
  if (query.remote_alias === clientapi_name && query.call_tag === clientapi_tag) {
    console.info("PARTICIPANT_POL: ClientAPI bypass");
    return pol_response;
  }

  // Process requests if protocol === "api" - main actions here & prevents double handle for Web clients
  if (query.protocol === "api") {
    // If IDP attributes are present, built overlay text
    if (query.idp_attribute_jobtitle && query.idp_attribute_surname && query.idp_attribute_department) {
      pol_response.result = {
        remote_display_name: query.idp_attribute_jobtitle + " " + query.idp_attribute_surname + " | " + query.idp_attribute_department,
      };
      console.info("PARTICIPANT_POL: Display name updated: ", pol_response.result.remote_display_name);
    }

    // Inspect VMR service_tag for participant treatment
    console.info("PARTICIPANT_POL: service_tag: ", query.service_tag);
    const tag_params = query.service_tag.split("_");
    // Check for known service_tag treatments
    switch (true) {
      // "AllDept" tag - continue based on VMR config - classification change based on idp_attribute_clearance
      case tag_params[0] === "allDept": {
        console.info("PARTICIPANT_POL: Using ClientAPI to monitor VMR classification: ", query.service_name);
        clientAPI.monitorClassLevel(query.service_name, query.participant_uuid, query.idp_attribute_clearance);
        break;
      }

      // "rank" tag - entry condition based on rank lists from pexPolicyConfig
      case tag_params[0] === "rank": {
        if (tag_params[1] === "co" && rankCo.includes(query.idp_attribute_jobtitle)) {
          // CO Memeber
          console.info("PARTICIPANT_POL: Participants idp jobtitle is on CO list OK");
        } else if (tag_params[1] === "top" && rankTop.includes(query.idp_attribute_jobtitle)) {
          // Top Member
          console.info("PARTICIPANT_POL: Participants idp jobtitle is on TOP list OK");
        } else {
          // Not in any rank list
          pol_response_reject.result.reject_reason = "ACCESS DENIED You do not have the required rank";
          console.warn("PARTICIPANT_POL: Participants idp jobtitle NOT in any rank list, response:", pol_response_reject);
          return pol_response_reject;
        }
        break;
      }

      // Entry condition based on idp attribute/value match from idpAttr list
      case idpAttrs.includes(tag_params[0]): {
        if (query["idp_attribute_" + tag_params[0]] === tag_params[1]) {
          console.info("PARTICIPANT_POL: Participants idp attribute matches service_tag OK");
        } else {
          pol_response_reject.result.reject_reason = "ACCESS DENIED You are not in: " + tag_params[1];
          console.warn("PARTICIPANT_POL: Participants idp attribute does NOT match service_tag, response:", pol_response_reject);
          return pol_response_reject;
        }
        break;
      }

      // Default response
      default: {
        console.info("PARTICIPANT_POL: service_tag does not match any treatments, default continue");
      }
    }

    // Return treated response
    console.info("PARTICIPANT_POL: Response:", pol_response);
    return pol_response;
  } else {
    // Default response for non protocol === "api" requests
    console.info("PARTICIPANT_POL: Not API protocol, default continue");
    return pol_response;
  }
}

module.exports = participantPropPol;
