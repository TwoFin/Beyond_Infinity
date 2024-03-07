// pexServicePolicy.cjs
// Handles Pexip Infinty external policy 'service/configuration' requests

// ClientAPI ID settings from ENV
const clientapi_name = process.env.PEXIP_CLIENTAPI_NAME;
const clientapi_tag = process.env.PEXIP_CLIENTAPI_TAG;

async function serviceConfigPol(query) {
  // set pol_response to default continue
  let pol_response = {
    status: "success",
    action: "continue",
  };

  // ClientAPI bypass sets host IDP to null 
  if (query.remote_alias === clientapi_name && query.call_tag === clientapi_tag) {
    pol_response.result = {
      name: query.local_alias,
      service_tag: "virtual_ClientAPI",
      service_type: "conference",
      host_identity_provider_group: "",
    };
    console.info("SERVICE_POL: ClientAPI bypass");
    return pol_response;
  }

  // Default 'continue' response
  else {
    console.info("SERVICE_POL: Default continue");
    return pol_response;
  }
}

module.exports = serviceConfigPol;