# Pexip Infinity API Intergration Server

Node.JS server to leverage Pexip Infinity APIs to provide features and functions not 'built-in' to the Infinity solution

Current supported APIs

1. External Policy Server - service config & participant properties

2. REST Client API for VMRs

## Current Features and Functions Overview

1. Display name contsruction based on IDP attributes

1. VMR entry control based on IDP attibutes

2. VMR Classification level change based on participant entry/exit & IDP attribute 'clearance'

## Files
app.cjs - Entry point creating http server and routing to modules

pexServicePolicy.cjs - Module to handles Pexip Infinty external policy 'Service config' requests

pexParticipant.cjs - Module to handles Pexip Infinity external policy 'Participant properties' requests

pexpolicyConfig.json - Configuration data used for external policy modules

pexClientAPI.cjs - Module handles outbound REST ClientAPI request and local VMR 'object' representation

## Enviroment Variables
PEXIP_NODE - Conference node to send ClientAPI requests

PEXIP_CLIENTAPI_TAG - call_tag to use for security

PEXIP_CLIENTAPI_NAME - display name to use, also checked for security

## Current Features and Functions Detailed

### Display name contsruction based on IDP attributes
If the participant has IDP attibutes, display name (overlay text) is contructed: jobtitle surname | department

### VMR treatment based on service_tag
Service tags are deiminated by underscore '_' to produce variables to use for treament i.e.:

"allAdf" is a single variable 
"department_Airforce" is separated into two variables: "department" & "Airforce"

Then these are processed:

1. If Var1 is "AllDept" then allow IDP authenticated users to join, then use pexClientAPI to change security watermark as according to participants .

2. If Var1 is "rank" then participants rank (jobtitle) is checked in a list named by Var2, currently there are two lists 'co' for Commissioned Offices and 'top' for top rank only. If the participant does not have the required rank (jobtitle) they are refused entry to VMR.

3. Var1 is tested against a list of IDP attributes (claims configure on Infinity & IDP), if there is a match then only participants with that IDP parameter matching Var2 will be allowed into VMR. In the above example only participants with IDP claim 'department' matching 'Airforce' will be allowed into the VMR.

    Other examples of VMR tags:

    "jobtitle_Sergeant": Only participants with rank of sergeant (jobtitle) are allow into the VMR

    "givenname_Jon": Only participants called Jon will be allowed into VMR - not real life but shows how different IDP claims can be used

4. Any other calls, i.e.: no service tag, are allowed to continue to prevent failures in demo environment. In production this would likely be set to reject call.
