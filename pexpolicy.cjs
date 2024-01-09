// pexpolicy.cjs
// Process Pexip Infinity external policy requests

// pexClientApi import and MeetBot setting;
const clientAPI = require("./pexClientAPIv3.cjs");
const clientapi_name = process.env.PEXIP_CLIENTAPI_NAME;
const clientapi_tag = process.env.PEXIP_CLIENTAPI_TAG;

// configuration file
const pexpolicyConfig = require("./pexpolicyConfig.json");
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

class PexPolicy {
  // process service/configuration policy request
  async service_config(query) {
    // Copy responses in local scope
    const pol_response = Object.assign({}, pol_continue);

    // MeetBot bypass
    if (query.remote_alias === clientapi_name && query.call_tag === clientapi_tag) {
      pol_response.result = {
        name: query.local_alias,
        service_tag: "allDept",
        service_type: "conference",
        host_identity_provider_group: "",
      };
      console.info("PEXPOLICY: MEETBOT bypassing service with no IDP", pol_response);
      return new Promise((resolve, _) => resolve(pol_response));
    }

    // Default response
    else {
      console.info("PEXPOLICY: No changes:", pol_response);
      return new Promise((resolve, _) => resolve(pol_response));
    }
  }

  // process participant/properties policy request
  async participant_prop(query) {
    // Copy responses in local scope
    const pol_response = Object.assign({}, pol_continue);
    const pol_response_reject = Object.assign({}, pol_reject_msg);

    // MeetBot bypass
    if (query.remote_alias === clientapi_name && query.call_tag === clientapi_tag) {
      console.info("PEXPOLICY: MEETBOT bypassing partipant policy");
      return new Promise((resolve, _) => resolve(pol_response));
    }

    // Build overlay text from IDP attr
    if (
      query.idp_attribute_jobtitle &&
      query.idp_attribute_surname &&
      query.idp_attribute_department &&
      // Only do text change if protocol is API - prevents double handle
      query.protocol === "api"
    ) {
      pol_response.result = {
        remote_display_name: query.idp_attribute_jobtitle + " " + query.idp_attribute_surname + " | " + query.idp_attribute_department,
      };
      console.info("PEXPOLICY: Display name updated: ", pol_response.result.remote_display_name);
    } else {
      console.info("PEXPOLICY: Skipping build overlay text name, default will be used");
    }

    // Extract params from service_tag
    const tag_params = query.service_tag.split("_");
    console.info("PEXPOLICY: service_tag parmameters: ", tag_params);

    switch (true) {
      // All departments tag - continue based on VMR config - allows classification change based on idp_attribute_clearance
      case tag_params[0] === "allDept": {
        // Only do ClientAPI call if protocol is API - prevents double handle
        if (query.protocol === "api") {
          console.info("PEXPOLICY: Using ClientAPI to change VMR classification level to", query.idp_attribute_clearance);

          clientAPI.lowerClassLevel(query.service_name, query.idp_attribute_clearance);
        }
        console.info("PEXPOLICY: Participant policy done:", pol_response);
        return new Promise((resolve, _) => resolve(pol_response));
      }

      // Entry condition based on rank
      case tag_params[0] === "rank": {
        if (tag_params[1] === "co" && rankCo.includes(query.idp_attribute_jobtitle)) {
          // CO Memeber
          console.info("PEXPOLICY: Participants idp jobtitle is on CO list OK");
          console.info("PEXPOLICY: Participant policy done:", pol_response);
          return new Promise((resolve, _) => resolve(pol_response));
        } else if (tag_params[1] === "top" && rankTop.includes(query.idp_attribute_jobtitle)) {
          // Top Member
          console.info("PEXPOLICY: Participants idp jobtitle is on TOP list OK");
          console.info("PEXPOLICY: Participant policy done:", pol_response);
          return new Promise((resolve, _) => resolve(pol_response));
        } else {
          pol_response_reject.result.reject_reason = "ACCESS DENIED You do not have the required rank";
          console.info("PEXPOLICY: Participants idp jobtitle NOT in any rank list");
          console.info("PEXPOLICY: Participant policy done:", pol_response_reject);
          return new Promise((resolve, _) => resolve(pol_response_reject));
        }
      }

      // Entry condition based on idp attribute from idpAttr list
      case idpAttrs.includes(tag_params[0]): {
        // Extract idp attribute to check
        const idpCheckAttr = "idp_attribute_" + tag_params[0];

        // Admit participant if idp attribute matches 2nd tag parameter
        if (query[idpCheckAttr] === tag_params[1]) {
          console.info("PEXPOLICY: Participants idp attribute matches service_tag OK");
          console.info("PEXPOLICY: Participant policy done:", pol_response);
          return new Promise((resolve, _) => resolve(pol_response));
        }

        // Reject if no match
        else {
          pol_response_reject.result.reject_reason = "ACCESS DENIED You are not in the " + tag_params[1];
          console.info("PEXPOLICY: Participants idp attribute does NOT match service_tag");
          console.info("PEXPOLICY: Participant policy done:", pol_response_reject);
          return new Promise((resolve, _) => resolve(pol_response_reject));
        }
      }

      // Default response
      default: {
        console.info("PEXPOLICY: Participant policy done, default response:", pol_response);
        return new Promise((resolve, _) => resolve(pol_response));
      }
    }
  }
}
module.exports = PexPolicy;
