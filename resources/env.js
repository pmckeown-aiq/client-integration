var util = require('util');
var fs = require('fs-extra');
var path = require('path');
var _ = require('lodash');
// For the log file
var bunyan = require('bunyan');
// Set up the logger for app
var appLog = bunyan.createLogger({
  name: 'integration',
  streams: [{
    path: './public/logs/integration.log'
  }]
})


// Read the environment configuration
module.exports = {
env: function(opts ,cb) {
  // Remove the quotes that client may have added ...
  opts.type = opts.type.replace(/"/g,"");
  opts.coID = opts.coID.replace(/"/g,"");
  var appDir = path.dirname(require.main.filename);
  var config = require(appDir + '/conf/config.js');
  // read environment variables 
  // get the connection using the coID
  for (var i = 0; i < config.envs.length; i++){
    if (config.envs[i].coID == opts.coID){
       opts.connection = {};
       //console.log('checking ' + JSON.stringify(config.envs));
       opts.connection.url = config.envs[i].conn.url;
       opts.connection.pKey = config.envs[i].conn.pKey;
       opts.connection.uKey = config.envs[i].conn.uKey;
       // additional/secondary databases for updating
       opts.additionalEnvs = config.envs[i].additionalEnvs;
    }
  }
  //console.log('pKey is ' + opts.pKey);
  // Read the transaction type specific configuration
  // read environment variables for processing rules
  opts.coID.replace(/"/g,"");
  for (var i = 0; i < config.integrationTypes.length; i++){
    if (config.integrationTypes[i].type.type == opts.type){
       opts.processRules = config.integrationTypes[i].processRules;
       opts.processRules.clientName = config.integrationTypes[i].clientName;
       // Write Back .. options to write data back to the third party system
       opts.callbackRules = {};
       if ( typeof config.integrationTypes[i].callbackRules !== 'undefined' ) {
         opts.callbackRules = config.integrationTypes[i].callbackRules;
         opts.callbackRules.asyncLimit = config.integrationTypes[i].asyncLimit;
       }
       // array for storing values that need validation
       opts.clientSettings = {};
       //opts.clientSettings.loadDataFilters = config.integrationTypes[i].type.loadDataFilters;
       opts.clientSettings = config.integrationTypes[i].clientSettings;
       if ( opts.clientSettings.hasLines != true ) {
         opts.clientSettings.lineValues = false;
       }
	opts.clientSettings.displayHeaderValues = _.filter(opts.clientSettings.headerValues, { "display" : true });
	opts.clientSettings.getHeaderValueFromMappedData = _.filter(opts.clientSettings.headerValues, [ "suppliedFromMappedData" , true ]);
	if ( opts.clientSettings.hasLines == true ) {
	  opts.clientSettings.displayLineValues = _.filter(opts.clientSettings.lineValues, { "display" : true });
        }
       opts.apiSettings = {};
       opts.apiSettings.apiFilters = config.integrationTypes[i].apiFilters;
       opts.objectsToMap = [];
       // Collate the objects to validate/map for the client
       opts.clientSettings.headerValues.forEach(function(object) {
         if ( object.hasOwnProperty('map') ) {
           if ( object.map == true ) {
	     var myMapObject = {};
	     myMapObject.name = object.name;
	     myMapObject.map = object.map;
	     myMapObject.displayName = object.displayName;
	     myMapObject.mapSourceType = object.mapSourceType;
	     if ( object.mapAdditionalProperty ) {
	       myMapObject.mapAdditionalProperty = object.mapAdditionalProperty;
	       myMapObject.mapAdditionalValues = object.mapAdditionalValues;
	     }
             opts.objectsToMap.push( myMapObject );
           }
         }
       })
       opts.objectsToValidate = [];
       // Collate the objects to validate/map for the client
       opts.clientSettings.headerValues.forEach(function(object) {
         if ( object.hasOwnProperty('validate') ) {
           if ( object.validate.hasOwnProperty('exists') ) {
             if ( object.validate.exists == true ) {
               opts.objectsToValidate.push({ 'name': object.name, 'validate': object.validate, 'displayName': object.displayName });
             }
           }
         }
       })
       // May not have lines ...
       //console.log(JSON.stringify('Has Lines' +  opts.clientSettings.hasLines));
       if ( opts.clientSettings.hasLines == true ) {
         opts.clientSettings.lineValues.forEach(function(object) {
           if ( object.hasOwnProperty('map') ) {
             if ( object.map == true ) {
		 var myMapObject = {};
		 myMapObject.name = object.name;
		 myMapObject.map = object.map;
		 myMapObject.displayName = object.displayName;
		 // CANT MAP ENVIRONMENT ON LINES!
		 //myMapObject.isEnvironmentIdentifier = ;
		 //myMapObject.nameEnvironmentIdentifier = ;
                 opts.objectsToMap.push( myMapObject );
             }
           }
         })
         opts.clientSettings.lineValues.forEach(function(object) {
           if ( object.hasOwnProperty('validate') ) {
             if ( object.validate.hasOwnProperty('exists') ) {
               if ( object.validate.exists == true ) {
                 opts.objectsToValidate.push({ 'name': object.name, 'validate': object.validate, 'displayName': object.displayName });
               }
             }
           }
         })
       }
    }
  }
  // return the constructed options
  cb({ opts })
}
}
