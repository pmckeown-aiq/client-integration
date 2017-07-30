var Q = require('q');
var soap = require('soap');
var util = require('util');
var fs = require('fs-extra');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var _ = require('lodash');

var errors = [
   "Invalid credentials",
   "Unkown error",
   "API error"
]

var errorCodes = {
   INVALID_CREDENTIALS: 0,
   UNKNOWN_ERROR: 1,
   API_ERROR: 2
};

var aiqClient = require(appDir + '/helper/aiqClient.js');

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
     ////console.log('clientName is ' + clientName );
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
     opts.clientSettings.lineValues.forEach(function(object) {
       if ( object.hasOwnProperty('validate') ) {
         if ( object.validate.hasOwnProperty('exists') ) {
           if ( object.validate.exists == true ) {
             objectsToValidate.push(object.name);
           }
         }
       }
     })
     objectsToValidate.forEach(function(objectToValidate) {
       //console.log('objectToValidate ' + JSON.stringify(objectToValidate));
       var thisObject = codeMaintenanceSettings[objectToValidate];
       var validateWith = thisObject.validateWith;
       process.send({"extract": objectToValidate ,"success":false})
       soap.createClient(opts.connection.url, (err, client) => {
       ////console.log('Running load static data ' + validateWith );
       ////console.log('Running load static data ' + clientName );
       var aiq = new aiqClient(client, opts.connection.pKey, opts.connection.uKey, opts.coID);
       //Q.all([aiq.genericCall(valueToValidate.via)])
       Q.all([aiq[validateWith] ()])
          .then((result) => {
             var filename = validateWith + '.extract.json';
              for(var p in result)
               if( result[p] === '' )
                delete result[p]
    
             var file = path.join(appDir , 'clients', clientName , '/data/', filename);
	     ////console.log('file is ' + file );
             //fs.writeFileSync(file, util.inspect(r));
             fs.writeFileSync(file, JSON.stringify(result));
             var isSuccess = { 'extract' : objectToValidate , 'success' : true }; 
             return cb(isSuccess);
          })
          .fail(err => {
             //console.log(JSON.stringify(err));
             var isSuccess = { 'extract' : objectToValidate , 'success' : false }; 
             return cb(isSuccess);
          })
          .done();
      })
    })
  }
}
