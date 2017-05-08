var Q = require('q');
var soap = require('soap');
var util = require('util');
var fs = require('fs-extra');
var path = require('path');
var appDir = path.dirname(require.main.filename);
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

// Helper files to check hard code values on lookup
var aiqClient = require(appDir + '/resources/aiqClient.js');
var config = require(appDir + '/conf/config.js');
// Read the "codeMaintenanceSettings" in the configuration file - this maps what to use
// when creating objects (and gives them a name)
var codeMaintenanceSettings = config.codeMaintenanceSettings;
console.log('codeMaintenanceSettings are ' + JSON.stringify(codeMaintenanceSettings));
//
module.exports = createObject = function(opts) {
};

createObject.prototype.CustomerCode = function(opts, object, cb) {
  //console.log('createObject opts ' + JSON.stringify(opts));
  //console.log('objectType is ' + JSON.stringify(objectType));
  //console.log('object is ' + JSON.stringify(object));
  soap.createClient(opts.connection.url, (err, client) => {
    var aiq = new aiqClient(client, opts.connection.pKey, opts.connection.uKey, opts.coID);
    Q.all([aiq.GetNewCustomerFromDefaults()])
      .then(([r]) => {
         console.log(`New customer from defaults: ${require('util').inspect(r)}`)
	 // we will use r as the result but SOAP from GetNewCustomerFromDefaults wraps it as r.Result so ...
         r = r.Result;
         // remove all the blanks
         for(var p in r)
            if( r[p] === '' )
                delete r[p]
         delete r['CreationDate']
         // Set the code from the client data - DON'T 
         //r.Code = object.code;
         r.Name = 'Created by Import';
         // Check to see if the client (options) has details
	 // data contains the data that was set in the pop up form on the client
	 var data = object.data;
         for (var p in data) {
           if( data.hasOwnProperty(p) ) {
             console.log(p + " , " + data[p])
             // insert them to "r" - the account we will create
             r[p] = data[p];
           } 
         }
         console.log('OK - customer to create is ' + JSON.stringify(r));
         // Create the account
         Q.all([aiq.UpdateCustomer({customer: r, create: true})])
           .then(([r2]) => {
             console.log('got back from createAccount ' + JSON.stringify(r.Code) + ' result ' + JSON.stringify(r2));
             cb({ "code": object.code, "objectType": objectType, "status": r2.Status });
           })
           .fail(err => {
             console.log('Error: in createAccount :', errors[err.error])
             cb({ "code": object.code, "objectType": objectType, "status": false });
             console.log(err)
           })
         })
       .fail(err => {
         console.log(err)
       })
        .done();
  })
}

createObject.prototype.DepartmentID = function(opts, object, cb) {
  //console.log('createObject opts ' + JSON.stringify(opts));
  //console.log('objectType is ' + JSON.stringify(objectType));
  console.log('object is ' + JSON.stringify(object));
  // Add the "code" (called "id" in the SOAP action) into the object.data
  object.data.id = object.code;
  soap.createClient(opts.connection.url, (err, client) => {
    var aiq = new aiqClient(client, opts.connection.pKey, opts.connection.uKey, opts.coID);
    // Create the account
    Q.all([aiq.CreateDepartment(object.data)])
      .then(([r]) => {
        console.log('got back from CreateDepartment ' + JSON.stringify(r.Code) + ' result ' + JSON.stringify(r));
        cb({ "code": object.code, "objectType": objectType, "status": r.Status });
      })
      .fail(err => {
        console.log('Error: in createAccount :' + JSON.stringify(err));
        cb({ "code": object.code, "objectType": objectType, "status": false });
      })
      .done();
  })
}
