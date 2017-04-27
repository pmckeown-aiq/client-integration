var _ = require('lodash');
// async for stacking up api calls to external systems
var async = require('async')
// For the log file
var bunyan = require('bunyan');
// Set up the logger for app
var path = require('path');
var appDir = path.dirname(require.main.filename);
var appLog = bunyan.createLogger({
  name: 'integration',
  streams: [{
    path: appDir + '/public/logs/integration.log'
  }]
})

var safeEval = require('safe-eval');

module.exports = writeData = function(opts) {
};

writeData.prototype.harvestExpensesApi = function(opts, transaction, callback) {
  console.log(JSON.stringify(transaction));
  console.log(JSON.stringify(appDir));
  var config = require(appDir + '/conf/harvest.json');
  var Harvest = require(appDir + '/harvest.js'),
    harvest = new Harvest({
      subdomain: config.harvest.subdomain,
      email: config.harvest.email,
      password: config.harvest.password
    });
  console.log('in writeData ' + JSON.stringify(opts.writeBackRules));
  if ( opts.writeBackRules.onLines == true ) {  
    console.log('invoice line ' + JSON.stringify(transaction.Lines.InvoiceLine))
    transaction.Lines.InvoiceLine.forEach(function(line) {
      harvestOptions = {};
      harvestOptions['expense'] = {};
      harvestOptions.id = safeEval('line.' + opts.writeBackRules.options.id, {line : line})
      // harvest removes the ID - so need to copy it 
      var myHarvestID = harvestOptions.id;
	    console.log('here 1');
      // Set the field in harvestOptions to be the value on the line
      harvestOptions['expense'][opts.writeBackRules.apiFieldName] = safeEval(opts.writeBackRules.options.object, {line : line});
      // then prefix this value with the "value" defined in the conf file ..
      harvestOptions['expense'][opts.writeBackRules.apiFieldName] = opts.writeBackRules.options.value + ":" +  harvestOptions['expense'][opts.writeBackRules.apiFieldName];
	    console.log('here 2' +  harvestOptions['expense'][opts.writeBackRules.apiFieldName] +  [opts.writeBackRules.apiFieldName] );
      console.log('in writeData ' + JSON.stringify(harvestOptions));
      
      myRoutine = harvest[opts.writeBackRules.apiFunction];
      console.log('call harvest ' + opts.writeBackRules.apiFunctionn + '.' + opts.writeBackRules.method + ' options: ' + JSON.stringify( harvestOptions));
      myRoutine[opts.writeBackRules.method](harvestOptions, function(cb) {
        if ( cb != null ) { 
          if ( cb.status >= 400 && cb.status < 500 ) {
            console.log('400 Error:' + JSON.stringify(cb));
          } else if ( cb.status >= 300 && cb.status < 400 ) {
            console.log('300 Error:' + JSON.stringify(cb));
          } else {
            console.log('Got Back :' + JSON.stringify(cb));
	  }
	  callback({ "xTransactionRef": myHarvestID, "status":false, "errorCode": cb, "message": harvestOptions[opts.writeBackRules.apiFieldName]}, null);
	} else { 
	  console.log('Update complete - no error'+  myHarvestID);
	  callback(null, { "xTransactionRef": myHarvestID, "status":true, "message": harvestOptions[opts.writeBackRules.apiFieldName] });
	}
      })
    })
  } else {
    console.log(v.WriteBackID);
  }
}
