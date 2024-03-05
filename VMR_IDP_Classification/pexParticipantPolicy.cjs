// pexParticipant.cjs
// Handles Pexip Infinity external policy 'Participant properties' requests
// TODO - need to tidy up & abtract/simplify to remove dependency on lower level modules

// Imports, config & ENV
const idpControl = require("./idpControl.cjs");
const config = require("./config.json");
const clientapi_name = process.env.PEXIP_CLIENTAPI_NAME;
const clientapi_tag = process.env.PEXIP_CLIENTAPI_TAG;
// Set list of IDP attibutes & VMR service_tag(s) to treat - TODO consider using "idpControl_" in Infinity service_tag
const idpAttrs = config.idpAttrs;
const treatedVmrsTag = config.treatedVmrsTag;

async function participantPropPol(query) {
  // set pol_response to default continue
  let pol_response = {
    status: "success",
    action: "continue",
  };

  // ClientAPI bypass
  if (query.remote_alias === clientapi_name && query.call_tag === clientapi_tag) {
    console.info("PARTICIPANT_POL: ClientAPI bypass");
    return pol_response;
  }

  // Deliminate VMR service_tag by "_"
  console.info("PARTICIPANT_POL: service_tag: ", query.service_tag);
  const tag_params = query.service_tag.split("_");
  
  // Process request based on protocol
  console.info("PARTICIPANT_POL: protocol: ", query.protocol);
  switch (true) {
    case query.protocol === "api": {
      if (tag_params[0] === "IDPC") {
        pol_response = idpControl(tag_params, query, pol_response)
      }
      break;
    }
    case query.protocol === "webrtc": {
      // Do nothing - future function
      break;
    }
    case query.protocol === "sip": {
      // Do nothing - future function - endpoint ABAC into protected VMRs
      break;
    }
    case query.protocol === "rtmp": {
      // Do nothing - future function
      break;
    }
    case query.protocol === "h323": {
      // Do nothing - future function
      break;
    }
    case query.protocol === "mssip": {
      // Do nothing - future function
      break;
    }
  }

  // Log & return policy response
  console.info("PARTICIPANT_POL: Response:", pol_response);
  return pol_response;
}

module.exports = participantPropPol;
