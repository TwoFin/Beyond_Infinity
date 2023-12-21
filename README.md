# External Infinity policy Server that uses VMR service tags and IDP attributes to allow or refuse entry to the VMR.

Service tags are first deiminated by underscore '_' to produce two variables i.e.:
"department_Airforce" is separated into two variables:
Var1: department
Var2: Airforce

Then these are processed:

1. If Var1 is "AllDept" then allow IDP authenticated users to join, then use pexClientAPI.js (MeetBot in logs) to lower security watermark if required.

2. If Var1 is "rank" then participants rank (jobtitle) is checked in a list named by Var2, currently there are two lists 'co' for Commissioned Offices and 'top' for top rank only. If the participant does not have the required rank (jobtitle) they are refused entry to VMR.

3. Var1 is tested against a list of IDP attributes (claims configure on Infinity & IDP), if there is a match then only participants with that IDP parameter matching Var2 will be allowed into VMR. In the above example only participants with IDP claim 'department' matching 'Airforce' will be allowed into the VMR.
Other examples of VMR tags:
"jobtitle_Sergeant": Only participants with rank of sergeant (jobtitle) are allow into the VMR
"givenname_Jon": Only participants called Jon will be allowed into VMR - not real life but shows how different IDP claims can be used

4. Any other calls, i.e.: no service tag, are allowed to continue to prevent failures in demo environment. In production this would likely be set to reject call.

## Current list entries from pexpolicyConfig.json file:

IDP attributes: ["department", "jobtitle", "givenname", "surname"]

CO Rank: 
["Air Chief Marshal",
    "General",
    "Admiral",
    "Colonel",
    "Captain",
    "Squadron Leader",
    "Major",
    "Lieutenant"
]

Top Rank:
["Air Chief Marshal",
    "General",
    "Admiral"
]

## Client API setting are loaded from enviroment variables to enable setting up for different Infinty enviroments:

PEXIP_NODE - Conference node to send ClientAPI requests

PEXIP_CLIENTAPI_TAG - call_tag to use for security

PEXIP_CLIENTAPI_NAME - display name to use, also checked for security

