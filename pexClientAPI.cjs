const fetch = require("node-fetch");

const pexnode = process.env.PEXIP_NODE;
const clientapi_name = process.env.PEXIP_CLIENTAPI_NAME;
const clientapi_tag = process.env.PEXIP_CLIENTAPI_TAG;

const pexnodeapi = "https://" + pexnode + "/api/client/v2/conferences/";

class controlClass {
  async lowerClass(vmr, level) {
    console.log(
      "CLIENT_API: Recieved level change request for: " + vmr + " to:" + level
    );
    // Obtain token
    var url = pexnodeapi + vmr + "/request_token";
    var json = { display_name: clientapi_name, call_tag: clientapi_tag };
    console.log("CLIENT_API:", url);
    var response = await fetch(url, {
      method: "post",
      body: JSON.stringify(json),
      headers: { "Content-Type": "application/json" },
    });
    var data = await response.json();
    console.log("CLIENT_API:", response.status);
    var thistoken = data.result.token;

    // Get vmr classification levels and current level
    var url = pexnodeapi + vmr + "/get_classification_level";
    console.log("CLIENT_API:", url);
    var response = await fetch(url, {
      headers: { token: thistoken },
    });
    var data = await response.json();
    var current_level = data.result.current;
    var level_map = data.result.levels;
    console.log("CLIENT_API: Availible security levels are: ", level_map);
    console.log("CLIENT_API: Current security level is: ", current_level);

    // Reverse look up new participant classification level from level_map
    var new_level = Number(
      Object.keys(level_map).find((e) => level_map[e] == level)
    );
    console.log(
      "CLIENT_API: New participant security level is: ",
      new_level,
      ":",
      level
    );

    // Check if new_level has resolved
    if (new_level) {
      // Lower clissifiction level if new participant has lower class
      if (new_level < current_level) {
        var url = pexnodeapi + vmr + "/set_classification_level";
        var json = { level: new_level };
        console.log(
          "CLIENT_API: Requesting level change to",
          json.level,
          "from:",
          url
        );
        var response = await fetch(url, {
          method: "post",
          body: JSON.stringify(json),
          headers: { "Content-Type": "application/json", token: thistoken },
        });
        var data = await response.json();
        console.log("CLIENT_API:", response.status);
      } else {
        console.log(
          "CLIENT_API: No level change required as new participant has required clearance"
        );
        new_level = current_level;
      }
    }
    // Set to 0 level as participant does not have a matching classification
    else {
      console.warn(
        "Participant does not have matching classification setting, changing VMR to zero level"
      );
      var url = pexnodeapi + vmr + "/set_classification_level";
      var json = { level: 0 };
      var response = await fetch(url, {
        method: "post",
        body: JSON.stringify(json),
        headers: { "Content-Type": "application/json", token: thistoken },
      });
      var data = await response.json();
      console.log("CLIENT_API:", response.status);
    }

    // Release Token to disocnnect
    var url = pexnodeapi + vmr + "/release_token";
    console.log(url);
    var response = await fetch(url, {
      method: "post",
      headers: { token: thistoken },
    });
    console.log("CLIENT_API:", response.status);
  }
}
module.exports = controlClass;
