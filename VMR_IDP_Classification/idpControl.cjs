// Imports & config
const clientAPI = require("../Common/pexClientAPI.cjs");
const displayNameBuild = require("../Common/displayNameBuild.cjs");

const config = require("./config.json");

// Set lists for IDP processing from configuration file - TOFO thiese may not be required with new service_tag method
const idpAttrs = config.idpAttrs;
const rankTop = config.rankTop;
const rankCo = config.rankCo;

function idpControl (tag_params, query, pol_response){
  console.debug("idpControl: Recieved request for service_tag: ", tag_params);
  
  // Check if entry control by IDP attribute is required
  if (tag_params[1] !== "ANY"){
    console.info("idpControl: Processing VMR entry based on IDP Attr/Value: ", tag_params[1], tag_params[2] );
    if (query["idp_attribute_" + tag_params[1]] === tag_params[2]) {
      console.info("idpControl: Participants idp attribute matches service_tag OK");
    } else {
      console.warn("idpControl: Participants idp attribute does NOT match service_tag, response:");
      pol_response.action = "reject";
      pol_response["result"] = {"reject_reason": "ACCESS DENIED You are not member of: " + tag_params[2] };
    }
  }

  // Check what classification level is required
  console.info("idpControl:  VMR classification level is set to: ", tag_params[3]);
  if (tag_params[3] === "ANY"){
    // Set up VMR monitor and dynamicly change classification watermark
  } else {
    // Allow VMR entry based on participants clearance level - New Function
  }

  // If action is continue build disply name
  if (pol_response.action === "continue") {
    let displayName = displayNameBuild(query)
    pol_response.result = {
      remote_display_name: displayName,
    };
  }
  
  // Return resuling policy response
  return pol_response
}

module.exports = idpControl;