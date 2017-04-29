var _ = require('lodash');
// async for stacking up api calls to external systems
var async = require('async')
// For the log file
var bunyan = require('bunyan');
// Set up the logger for app
var path = require('path');
var appDir = path.dirname(require.main.filename);

var safeEval = require('safe-eval');
var config = require('./conf/harvest.json');
var Harvest = require('harvest'),
harvest = new Harvest({
  subdomain: config.harvest.subdomain,
  email: config.harvest.email,
  password: config.harvest.password
});
console.log(config.harvest.subdomain);
var id = 14560659;
harvest.Expenses.update({"expense":{"notes":"U:Accommodation"},"id":id}, function(cb) {
  if ( cb != null ) { 
    if ( cb.status >= 400 && cb.status < 500 ) {
      console.log('400 Error:' + JSON.stringify(cb));
    } else if ( cb.status >= 300 && cb.status < 400 ) {
      console.log('300 Error:' + JSON.stringify(cb));
    } else {
      console.log('Got Back :' + JSON.stringify(cb));
  }
    console.log({ "xTransactionRef": id, "status": false, "errorCode": cb});
  } else { 
    console.log('Update complete - no error'+  id);
    console.log({ "xTransactionRef": id, "status": true});
  }
})
