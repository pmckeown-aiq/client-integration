# integration-out

# AccountsIQ Integration Server

## Installation
Clone from Git
NEED TO TURN OF 2 FACTOR SECURITY
`$ git clone https://pmckeown-aiq@github.com/accountsIQ/integration-out.git`

`$ cd integration-out`

`$ npm install`

(see known issues to rectify oidcstrategy.js setting below)

(have tried to fix in git but may need to make additional directories for file uploads!) 	
`$ mkdir -p "./public/data/tmp"`
`$ mkdir -p "./public/logs/"`

## Authenication via Windows Azure Active Directory
Create an app in Azure Active Directory for OAUTH2 authentication

https://manage.windowsazure.com

Go to “Active Directory” - select your domain and select “Applications”

SIGN-ON URL 		http://<domain name>/

Client ID 			make a note of it

Create a key (2 years)		after save make a note of the key

Reply URL			http://<domain name>/
e.g. http://integration.accountsiq.com/

## Update configuration 

`$ vi ./conf/config.js.sample`

## Configure your accountsIQ database(s) or environment(s)

You must have one or more environments to load data into. You should have at least 1 test and 1 production environment. The environments are stored in an array `exports.env`.

in exports.envs 

`coID = '<your company id>'`

`conn.url = '<your WSDL endpoint>',	`

`conn.pKey = '<your partner key – requested from support@accountsiq.com>',`

`conn.uKey = '<your user key generated from company configuration>',`

For US hosted accounts: https://www.visorsoftware.com/system/dashboard/integration/integration_1_1.asmx?WSDL

For UK/European hosted accounts:  https://hostacct.com/system/dashboard/integration/integration_1_1.asmx?WSDL

Please refer to https://accountsiq.com/how-to-login/

within `	exports.creds:` section:
`returnURL: 'http://<domain name>/auth/openid/return',`

`clientID: '<your client ID>',`

`clientSecret: '<your client secret>',`

Configure your integrations
Rename to config.js
`$ cp ./conf/config.js.sample ./conf/config.js`

You can support loading data into more than one accountsIQ database by adding a property `additionalEnvs` into any given environments configuration. The `additionalEnvs` should be an array of additional environments, with each additionale environment containing a `coID` property, a `uKey` property and an `identifiedBy` property that contains a `name` (one of the properties or values provided by the source data) and a `value` (what the source data value will be equal to when the data record should be loaded into the secondary database).

## Configure the integrations that your environments support
You must have one or more `integrationTypes` to extract and load data into your accountsIQ database(s).
You can have multiple `integrationTypes`. An single integration type consists of a source data system, and a series of scripts to process the data. An explanation of the various options follows:

`type` - Type configures some basic information about the integration you are running.
`type.clientName` - The name used to identify your integration. This also identifies the path for certain data files (for validating data) and for processing data. See file structure below.
`type.type` - TODO - should this really be a displayName - is it 
`type.feedType` - what sort data feed is supplying the data to be loaded. See supported feed types for more information on the available settings.
`loadFrom` - CHECK THIS MAY NOT BE REQUIRED
`additionalEnvAllowed` - true or false. Specifies whether this integration supports loading data to multiple environments.
`additionalEnvIdentifier` - CHECK MAY NOT BE REQUIRED
`processScript` - this is a nodeJS script that will perform the transformation of data from the source feed and convert it into the structure required to load it into accountsIQ (it will transform the data into the document format as specified on the accountsIQ API Wiki. The script will accept two parameters - an array of transactions to process, and `clientSettings` (see below - TODO - put headerValues and lineValues into clientSettings property so that this flows!
`updateScript` - a nodeJS script that will update the data into the accountsIQ api. TODO - make updateData parameters clearer and make it consistent with processData in the way it is called.  
`transactionType` - the type of document or object that you want to load into accountsIQ. See supported data objects for more information as to what are currently available.
`transactionTemplate` - to load a document through the accountsIQ SOAP API you first template the transaction. This should be set to the method you call on the SOAP API to template your transaction.
TODO - change `negativeTransactionType` to `negativeTransaction` 
`negativeTransactionType` - If you want to allow your integration to process a negative transaction type you need to create this object. For a sales invoice an negative transaction would be a sales credit. If your source data supplies both positive and negative transactions you will need to configure this.
`negativeTransactionType.allow` - true/false value that specifies if you allow a negative transactions. 
`negativeTransactionType.transactionType` - the type of document or object that you want to load into accountsIQ. See supported data objects for more information as to what are currently available.
`negativeTransactionType.transactionTemplate` - to load a document through the accountsIQ SOAP API you first template the transaction. This should be set to the method you call on the SOAP API to template your transaction.
`negativeTransactionType.identifyBy`- the value in your document that will be checked to see if it is a negative or positive transaction. TODO - check can this be a header or a line value?
`apiFilters` - an object to store a list of filters that you may want to use to restrict data being extracted from an API based source. The object should store an array of filters as specified below:
	`name` - the name of the filter. This is would be passed as the "name or parameter name" to the source api.
	`loop` - a true/false value. Used to state whether more than one value would be passed and if so doe we need to "loop" through the values when extracting data from the source API.
	`value` - an value or array of values to be passed to limit the data extracted from the source API.
`hasLines` - true/false value which identifies whether a (TODO CHECK) document (or document from the API) has line values embedded within it.
`headerValues` - array of header values for the document that you are loading into accountsIQ. The array consists of a series of accountsIQ document "properties" and specifies what or how you are to supply them. See supported object types for more information on the structure of the accountsIQ documents.
	`name` - the name of the accountsIQ document property
	`supplied` - true or false value stating if it is supplied in your source data.
	`value` - the name of that property in your source data object. This can contain nodeJS string manipulation or mathematical operators if required. 
	`display` - true or false. Whether you want to display this property when the data is loaded to the client view for the operator to see.
	`displayName` - The lable applied if the data is displayed in the client view.
	`validate` - if you wish to validate the data that is supplied by the source system you need to configure a `validate` property and set it:
		`exists` - true/false. This states if you wish to validate the source object value to ensure that it exists in the accountsIQ database. This is used for reference data (customer accounts, propduct codes, tax codes, analysis codes etc.) but can also be set to `false` should you wish to ensure that a record does not exist in accountsIQ that has this value (for example External References on invoices). 
		`map` - true/false. This states if the value from the source system needs to be translated or mapped to an accountsIQ value whilst the data is being processed. See mapping data below.
		`ignoreCase` - true/false. Should case be ignored when validating or mapping data.

## Data Validation

## Mapping Data

### Install Forever (optional)

Forever allows NodeJS to run after session to server terminates (run as demon)
`$ [sudo] npm install forever -g`

`$ cd /path/to/your/project`

`$ [sudo] npm install forever-monitor`

## Starting Server 
### To run interactively (you must keep the session to the server open). Logging will be sent to the console window.
`$ node server.js`

From the directory into which the app is installed:
`$ forever start server.js` 

to stop use:
`$ forever stop server.js` 

Log files are in the user home directory in a `.forever/` folder. e.g.
```
$ cd ~/.forever/
$ ls -ltr
total 32
-rw-rw-r-- 1 ec2-user ec2-user 7521 Oct 15 13:49 wBcL.log
-rw-rw-r-- 1 ec2-user ec2-user 1485 Oct 15 22:07 f8IP.log
-rw-rw-r-- 1 ec2-user ec2-user 1485 Oct 15 22:10 Wpb7.log
-rw-rw-r-- 1 ec2-user ec2-user  296 Oct 15 22:12 config.json
drwxr-xr-x 2 ec2-user ec2-user 4096 Oct 15 22:12 sock
-rw-rw-r-- 1 ec2-user ec2-user 1485 Oct 15 22:12 tVSq.log
drwxr-xr-x 2 ec2-user ec2-user 4096 Oct 15 22:12 pids
```

# Known Issues
## server.js fails to run on install or after npm install (reloading of modules)

Following installation or a re-installation of node modules (using `npm install`) the Passport module for Azure active directory fails with an error referring to validateIssuer. You must edit:

`$ vi ./node_modules/passport-azure-ad/lib/oidcstrategy.js`

and on line change:

`options.validateIssuer = true;`

to 

`options.validateIssuer = false;`

## Proxying from port 80 to Node App on Linux
Receive a client side error (in log not show to user) regarding proxy request failed (error 500). This seems to be on the first connection only but means that the user may need to click the "upload file" button more than once to succesfully make a connection.


