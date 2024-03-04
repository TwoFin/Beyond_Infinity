# Pexip Infinity API Intergration Server

Node.JS server to leverage Pexip Infinity APIs to provide features and functions not 'built-in' to the Infinity solution

# Concept

Create code in modular method to enable swap of feature/functions easily via config file. Put re-usable modules into 'common' folder:

![Code flow, top level](codeflowTop.png)

## Current supported APIs

1. External Policy Server - service config & participant properties

2. REST Client API for VMRs

## Current Features and Functions Overview

### VMR_IDP_Classification feature

1. Display name contsruction based on IDP attributes

1. VMR entry control based on IDP attibutes

2. VMR Classification level change based on participant entry/exit & IDP attribute 'clearance'

## Enviroment Variables
PEXIP_NODE - Conference node to send ClientAPI requests

PEXIP_CLIENTAPI_TAG - call_tag to use for ClientAPI

PEXIP_CLIENTAPI_NAME - display name to use, also checked for ClientAPI
