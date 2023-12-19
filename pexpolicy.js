// pexpolicy.js
// Process Pexip Infinity external policy requests

// default policy responses
const pol_reject = {
    "status": "success",
    "action": "reject"
}
const pol_continue = {
    "status": "success",
    "action": "continue"
}

/// Set lists for IDP processing
const idpAttrs = ["department", "jobtitle", "givenname", "surname"]
const rankCo = ["Air Chief Marshal",
    "Squadron Leader",
    "Captain",
    "General",
    "Captain",
    "Admiral"
]
const rankTop = ["Air Chief Marshal",
    "General",
    "Admiral"
]

class PexPolicy {
    // process service/configuration policy request 
    async service_config(query) {

        const pol_response = Object.assign({}, pol_continue);
        pol_response.result = { "local_alias": query.local_alias }
        console.log(pol_response);
        return new Promise((resolve, _) => resolve(pol_response))

    }

    // process participant/properties policy request 
    async participant_prop(query) {

        // Extract parametes from service_tag
        const tag_params = query.service_tag.split("_")
        console.log("service_tag parmameters: ", tag_params)

        /// All departments tag - continue
        if (tag_params[0] === "allDept") {
            const pol_response = Object.assign({}, pol_continue);
            console.log(pol_response);
            return new Promise((resolve, _) => resolve(pol_response))
        }

        /// Entry condition based on rank
        else if (tag_params[0] === "rank") {
            if (tag_params[1] === "co" && rankCo.includes(query.idp_attribute_jobtitle)) {
                /// continue
                const pol_response = Object.assign({}, pol_continue);
                console.log("Participants idp jobtitle is on CO list OK")
                console.log(pol_response);
                return new Promise((resolve, _) => resolve(pol_response))
            }
            else if (tag_params[1] === "top" && rankTop.includes(query.idp_attribute_jobtitle)) {
                /// continue
                const pol_response = Object.assign({}, pol_continue);
                console.log("Participants idp jobtitle is on TOP list OK")
                console.log(pol_response);
                return new Promise((resolve, _) => resolve(pol_response))
            }
            else {
                const pol_response = Object.assign({}, pol_reject);
                console.log("Participants idp jobtitle NOT in any rank list")
                console.log(pol_response);
                return new Promise((resolve, _) => resolve(pol_response))
            }
        }

        /// Entry condition based on idp attribute from idpAttr list
        else if (idpAttrs.includes(tag_params[0])) {
            /// Extract idp attribute to check
            const idpCheckAttr = "idp_attribute_" + tag_params[0];

            /// Admit participant if idp attribute matches 2nd tag parameter  
            if (query[idpCheckAttr] === tag_params[1]) {
                const pol_response = Object.assign({}, pol_continue);
                console.log("Participants idp attribute matches service_tag OK")
                console.log(pol_response);
                return new Promise((resolve, _) => resolve(pol_response))
            }

            /// Reject if no match
            else {
                const pol_response = Object.assign({}, pol_reject);
                console.log("Participants idp attribute does NOT match service_tag")
                console.log(pol_response);
                return new Promise((resolve, _) => resolve(pol_response))
            }
        }

        /// Default response
        else {
            const pol_response = Object.assign({}, pol_continue);
            console.log(pol_response);
            return new Promise((resolve, _) => resolve(pol_response))
        }

    }

}
module.exports = PexPolicy;