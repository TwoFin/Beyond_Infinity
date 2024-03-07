// pexParticipant.cjs
// Handles Pexip Infinity external policy 'participant/properties' requests

// Imports, config & ENV
const idpControl = require("./idpControl.cjs");
const clientapi_name = process.env.PEXIP_CLIENTAPI_NAME;
const clientapi_tag = process.env.PEXIP_CLIENTAPI_TAG;

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
        pol_response = await idpControl(tag_params, query, pol_response)
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