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

writeData.prototype.harvestExpensesApi = function(opts, transaction) {
  return new Promise(function(resolve, reject) { 
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
    var fn = function updateHarvest(line){ // sample async action
      console.log('line in fn is ' + JSON.stringify(line));
      return new Promise(function(resolve, reject) { 
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
            resolve({ "xTransactionRef": myHarvestID, "status":false, "errorCode": cb, "message": harvestOptions[opts.writeBackRules.apiFieldName]});
          } else { 
            console.log('Update complete - no error'+  myHarvestID);
            resolve({ "xTransactionRef": myHarvestID, "status":true, "message": harvestOptions[opts.writeBackRules.apiFieldName] });
          }
        })
      })
    };

    var actions = transaction.Lines.InvoiceLine.map(fn); // run the function over all items.
    var writeData = Promise.all(actions); // pass array of promises
    writeData
      .then((result) => {
      console.log('ALL BACK IN writeDataHarvest' + JSON.stringify(result));
      resolve(result);
    });
  });
}
