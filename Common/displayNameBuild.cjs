// Imports & config
const config = require("./config.json");
const idpDisplayNameBuild = config.idpDisplayNameBuild;

function displayNameBuild(query) {
    let remote_display_name = query.remote_display_name;
    // Check if Participant is IDP Auth
    if (query.has_authenticated_display_name === "True") {
        try {
            // Attempt build from idpDisplayNameBuild list
            remote_display_name = ""
            idpDisplayNameBuild.forEach((element) => {
                if (element.startsWith("idp_attribute")) {
                    if (query[element] !== "") {
                        remote_display_name += query[element] + " ";
                    } else {
                        throw error;
                    }
                } else {
                    remote_display_name += element + " ";
                }
            });
            remote_display_name = remote_display_name.trimEnd();
        } catch (error) {
            // Return orginal remote_display_name on error
            console.error("displayNameBuild: Could not build display name from IDP attributes")
            remote_display_name = query.remote_display_name;
        }        
        console.info("displayNameBuild: IDP built display name:", remote_display_name)
        return remote_display_name

    } else {
        // Placeholder for other build methods i.e.: Endpoint name
        console.info("displayNameBuild: No display name built, returning original: ", remote_display_name)
        return remote_display_name
    }
}

module.exports = displayNameBuild