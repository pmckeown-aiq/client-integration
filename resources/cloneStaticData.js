var Q = require('q');
var soap = require('soap');
var util = require('util');
var fs = require('fs');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var _ = require('lodash');

var aiqClient = require(appDir + '/resources/aiqClient.js');

// Set up the logger for app
var bunyan = require('bunyan');
var appLog = bunyan.createLogger({
  name: 'integration',
  streams: [{
    path: './public/logs/integration.log'
  }]
})

module.exports = {
   extract: function(opts, cb) {
     var config = require(appDir + '/conf/config.js');
     var clientName = opts.clientName;
     // Read the "codeMaintenanceSettings" in the configuration file - this maps what to use when validating/creating objects (and gives them a name)
     var codeMaintenanceSettings = config.codeMaintenanceSettings;
     var objectsToValidate = [];
     opts.clientSettings.headerValues.forEach(function(object) {
       if ( object.hasOwnProperty('validate') ) {
         if ( object.validate.hasOwnProperty('exists') ) {
           if ( object.validate.exists == true ) {
             objectsToValidate.push(object.name);
           }
         }
       }
     })
     // May not have lines ...
     if ( opts.clientSettings.hasLines === true ) {
       opts.clientSettings.lineValues.forEach(function(object) {
         if ( object.hasOwnProperty('validate') ) {
           if ( object.validate.hasOwnProperty('exists') ) {
             if ( object.validate.exists == true ) {
               objectsToValidate.push(object.name);
             }
           }
         }
       })
     }
     objectsToValidate.forEach(function(objectToValidate) {
       var thisObject = codeMaintenanceSettings[objectToValidate];
       var validateWith = thisObject.validateWith;
       process.send({"extract": objectToValidate ,"success":false})
       // We may actually need to extract data from multiple environments 
       // so we need to construct an array which we can loop through 
       var extractEnvs = [] 
       // push the primary environment into the array - we will add to it if we have further databases ...
           extractEnvs.push({ "url": opts.connection.url, "clientName": clientName, "coID": opts.coID, "pKey": opts.connection.pKey, "uKey": opts.connection.uKey });	
       // Check if we have more than one database configured
       if ( typeof opts.additionalEnvs !== 'undefined' ) {
         console.log('We have a second database to extract from! ' + JSON.stringify(opts.additionalEnvs));
	 // additional environments are stored in an array
	 opts.additionalEnvs.forEach(function(additionalEnv) {
	   // push the additional environment into the extractEnvs array ...
           // only the coID and the uKey change (the rest should be the same)
           extractEnvs.push({ "url": opts.connection.url, "clientName": clientName, "coID": additionalEnv.coID, "pKey": opts.connection.pKey, "uKey": additionalEnv.uKey });	
         })
       }
       console.log('Extract for environments ' + JSON.stringify(extractEnvs.length));
       // Now run through each extractEnvs (may be just one!) 
       extractEnvs.forEach(function(extractEnv) {
         soap.createClient(extractEnv.url, (err, client) => {
         console.log('Running load static data ' + validateWith + ' env ' + extractEnv.coID );
         //console.log('Running load static data ' + clientName );
         var aiq = new aiqClient(client, extractEnv.pKey, extractEnv.uKey, extractEnv.coID);
         Q.all([aiq[validateWith] ()])
            .then((result) => {
              console.log('RESULT load static data ' + validateWith + ' env ' + extractEnv.coID );
              var filename = validateWith + '.extract.json';
              var file = path.join(appDir + '/clients/' + extractEnv.clientName + '/data/' + extractEnv.coID + '/' + filename);
              fs.writeFileSync(file, JSON.stringify(result));
              var isSuccess = { 'extract' : objectToValidate , 'coID': extractEnv.coID, 'success' : true }; 
              return cb(isSuccess);
            })
            .fail(err => {
               console.log('FAIL load static data ' + validateWith + ' env ' + extractEnv.coID );
               console.log(JSON.stringify(err));
               var isSuccess = { 'extract' : objectToValidate , 'coID': extractEnv.coID, 'success' : false , 'error': err}; 
               return cb(isSuccess);
            })
            .done();
         }) // SOAP create client
       }) // end loop for extractEnvs
    })
  }
}
