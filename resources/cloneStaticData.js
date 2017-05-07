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

async function createDepartment(v, slave) {
  var obj = await new Promise ((resolve, reject) => {
    console.log('Cloning static data ' + v.id + ' env ' + slave.url );
    soap.createClient(slave.url, (err, client) => {
      var aiq = new aiqClient(client, slave.pKey, slave.uKey, slave.coID);
      aiq['CreateDepartment'](v, (err, result) => {
	console.log('resolve with ' + JSON.stringify(result));
        resolve(result)
      })
    });
  });
  return obj;
}

module.exports = {
   clone: async function(opts, cb) {
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
      console.log("thisObject is " + JSON.stringify(thisObject))
      if (thisObject.validateWith == "GetDepartmentList") {
       var validateWith = thisObject.validateWith;
       process.send({"extract": objectToValidate ,"success":false})
       // We may actually need to extract data from multiple environments 
       // so we need to construct an array which we can loop through 
       var masterEnv = [] 
       var slaveEnv = [] 
       // push the primary environment into the array - we will add to it if we have further databases ...
           masterEnv.push({ "url": opts.connection.url, "clientName": clientName, "coID": opts.coID, "pKey": opts.connection.pKey, "uKey": opts.connection.uKey });	
       // Check if we have more than one database configured
       if ( typeof opts.additionalEnvs !== 'undefined' ) {
         console.log('We have a second database to extract from! ' + JSON.stringify(opts.additionalEnvs));
	 // additional environments are stored in an array
	 opts.additionalEnvs.forEach(function(additionalEnv) {
	   // push the additional environment into the extractEnvs array ...
           // only the coID and the uKey change (the rest should be the same)
           slaveEnv.push({ "url": opts.connection.url, "clientName": clientName, "coID": additionalEnv.coID, "pKey": opts.connection.pKey, "uKey": additionalEnv.uKey });	
         })
       }
       console.log('Slave environments ' + JSON.stringify(slaveEnv.length));
       console.log('masterEnv: ' + JSON.stringify(masterEnv));
       console.log('slaveEnv: ' + JSON.stringify(slaveEnv));
       // Now run through each extractEnvs (may be just one!) 
       slaveEnv.forEach(function(slave) {
         // Open the masterEnv data file (file produced by extractStaticData (for speed not a direct connection to the SOAP API (done inside the slaveEnv loop - as want a fresh copy of masterData on each pass (as we are editing the array to remove items already existing in the slave
       //var config = require(appDir + '/' + clientName + '/data/' + coID + '/GetDepartmentList.extract.json');
       var masterData = require(appDir + '/clients/' + clientName + '/data/' + 'axi1731' + '/GetDepartmentList.extract.json');
       if ( typeof masterData[0].Result !== 'undefined' ) {
         if ( typeof masterData[0].Result.Department === 'undefined' ) {
           process.send({ "error" : "error in cloneStaticData " , "data": "No master data to clone from"});
           console.log(JSON.stringify(masterData));
           throw ("No master data to clone from");
         }
       } else {
           process.send({ "error" : "error in cloneStaticData " , "data": "No master data to clone from"});
           throw ("No master data to clone from");
       }
         var slaveData = require(appDir + '/clients/' + clientName + '/data/' + slave.coID + '/GetDepartmentList.extract.json');
	 console.log('masterData1 : ' + masterData[0].Result.Department.length);
	 console.log('slaveData : ' + slave.coID + ';'  + slaveData[0].Result.Department.length);
         if ( typeof slaveData[0].Result !== 'undefined' ) {
           if ( typeof slaveData[0].Result.Department === 'undefined' ) {
             process.send({ "error" : "error in cloneStaticData " , "data": "No slave data  - extract file should have at least one record in it."});
             throw ("No slave data to clone to");
           }
         } else {
           process.send({ "error" : "error in cloneStaticData " , "data": "No slave data to clone from"});
           throw ("No slave data to clone to");
         }
	 // Compare the two arrays of objects - for Departments the field is DepartmentID
         // Grab the list from the slave environment
         slaveKeys = _.map(slaveData[0].Result.Department, 'DepartmentID'); 
         console.log('slaveKeys are ' + JSON.stringify(slaveKeys));
	 // now reject 
	 _.forEach(slaveKeys, function(key) {
           //console.log('Remove ' + key);
	   masterData[0].Result.Department = _.reject(masterData[0].Result.Department, { "DepartmentID": key });
         });
         console.log('After remove masterData is ' + masterData[0].Result.Department.length);
         masterData[0].Result.Department.forEach(function(record) {
           if (record.DepartmentID !== "ABB01" ) {
	     v = {};
	     v.id = record.DepartmentID;
	     v.description = record.Description;
	     v.analysisCode1 = record.AnalysisCode1;
	     v.analysisCode2 = record.AnalysisCode2;
	     v.analysisCode3 = record.AnalysisCode3;
	     v.analysisCode4 = record.AnalysisCode4;
	     v.analysisCode5 = record.AnalysisCode5;
	     v.analysisCode6 = record.AnalysisCode6;
             createDepartment(v, slave); 
	   }
         }) // end loop record in masterData[0].Result
       }) // end loop for extractEnvs
     } // end if thisObject == DepartmentID
    })
  }
}
