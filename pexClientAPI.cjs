const fetch = require("node-fetch");

const pexnode = process.env.PEXIP_NODE;
const clientapi_name = process.env.PEXIP_CLIENTAPI_NAME;
const clientapi_tag = process.env.PEXIP_CLIENTAPI_TAG;

const level_map = {
  0: "UNOFFICIAL",
  1: "OFFICIAL",
  2: "PROTECTED",
  3: "SECRET",
  4: "TOP SECRET",
};

const pexnodeapi = "https://" + pexnode + "/api/client/v2/conferences/";

class controlClass {
  async lowerClass(vmr, level) {
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

    // Reverse look up new participant classification level from level_map
    var new_level = Number(
      Object.keys(level_map).find((e) => level_map[e] == level)
    );
    console.log(
      "CLIENT_API: New participant security level is: ",
      level,
      "=",
      new_level
    );

    // Get current vmr classification level
    var url = pexnodeapi + vmr + "/get_classification_level";
    console.log("CLIENT_API:", url);
    var response = await fetch(url, {
      headers: { token: thistoken },
    });
    var data = await response.json();
    var current_level = data.result.current;
    console.log("CLIENT_API: Current security level is: ", current_level);

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
        "CLIENT_API: No level chenge required as new participant has required clearance"
      );
      new_level = current_level;
    }

    // Release Token to disocnnect
    var url = pexnodeapi + vmr + "/release_token";
    console.log(url);
    var response = await fetch(url, {
      method: "post",
      headers: { token: thistoken },
    });
    console.log("CLIENT_API:", response.status);

    //  Log resulting level
    const result = level_map[new_level];
    console.log("CLIENT_API: New classification level: ", result);
  }
}
module.exports = controlClass;