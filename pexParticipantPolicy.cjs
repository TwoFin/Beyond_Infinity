// pexParticipant.cjs
// Handles Pexip Infinity external policy 'Participant properties' requests
// TODO - need to tidy up & abtract/simplify to remove dependency on lower level modules

// Imports and ENV
const vmrTreatment = require("./vmrTreatments.cjs");
const pexpolicyConfig = require("./pexPolicyConfig.json");
const clientapi_name = process.env.PEXIP_CLIENTAPI_NAME;
const clientapi_tag = process.env.PEXIP_CLIENTAPI_TAG;
// Set list of IDP attibutes & VMR service_tag(s) to treat - TODO consider using "vmrtreatment_" in Infinity service_tag
const idpAttrs = pexpolicyConfig.idpAttrs;
const treatedVmrsTag = pexpolicyConfig.treatedVmrsTag;

async function participantPropPol(query) {
  // default policy response
  let pol_response = {
    status: "success",
    action: "continue",
  };

  // ClientAPI bypass
  if (query.remote_alias === clientapi_name && query.call_tag === clientapi_tag) {
    console.info("PARTICIPANT_POL: ClientAPI bypass");
    return pol_response;
  }

  // Process requests if protocol === "api" - main actions here & prevents double handle for Web clients
  if (query.protocol === "api") {
    // Inspect VMR service_tag and delimit by "_"
    console.info("PARTICIPANT_POL: service_tag: ", query.service_tag);
    const tag_params = query.service_tag.split("_");
    // Check if service_tag is in lists for treatment
    if (idpAttrs.includes(tag_params[0]) || treatedVmrsTag.includes(tag_params[0])) {
      // Send to VMR treament module
      pol_response = vmrTreatment(tag_params, query, pol_response);
      // Return treated response
      console.info("PARTICIPANT_POL: Response:", pol_response);
      return pol_response;
    } else {
      // Default response for non teated VMR
      console.info("PARTICIPANT_POL: Not a treated VMR service_tag, default continue");
      return pol_response;
    }
  } else {
    // Default response for non protocol === "api" requests - TODO expand to handle SIP/H323
    console.info("PARTICIPANT_POL: Not API protocol, default continue");
    return pol_response;
  }
}

module.exports = participantPropPol;
