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

module.exports = callback = function(opts) {
};

callback.prototype.harvestExpensesApi = function(opts, transaction) {
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
    console.log('in callback ' + JSON.stringify(opts.callbackRules));
    var fn = function updateHarvest(line){ // sample async action
      console.log('line in fn is ' + JSON.stringify(line));
      return new Promise(function(resolve, reject) { 
        harvestOptions = {};
        harvestOptions['expense'] = {};
        harvestOptions.id = safeEval('line.' + opts.callbackRules.options.id, {line : line})
        // harvest removes the ID - so need to copy it 
        var myHarvestID = harvestOptions.id;
        console.log('here 1');
        // Set the field in harvestOptions to be the value on the line
        harvestOptions['expense'][opts.callbackRules.apiFieldName] = safeEval(opts.callbackRules.options.object, {line : line});
        // then prefix this value with the "value" defined in the conf file ..
        harvestOptions['expense'][opts.callbackRules.apiFieldName] = opts.callbackRules.options.value + ":" +  harvestOptions['expense'][opts.callbackRules.apiFieldName];
        console.log('here 2' +  harvestOptions['expense'][opts.callbackRules.apiFieldName] +  [opts.callbackRules.apiFieldName] );
        console.log('in callback ' + JSON.stringify(harvestOptions));
        
        myRoutine = harvest[opts.callbackRules.apiFunction];
        console.log('call harvest ' + opts.callbackRules.apiFunctionn + '.' + opts.callbackRules.method + ' options: ' + JSON.stringify( harvestOptions));
        myRoutine[opts.callbackRules.method](harvestOptions, function(cb) {
          if ( cb != null ) { 
            if ( cb.status >= 400 && cb.status < 500 ) {
              console.log('400 Error:' + JSON.stringify(cb));
            } else if ( cb.status >= 300 && cb.status < 400 ) {
              console.log('300 Error:' + JSON.stringify(cb));
            } else {
              console.log('Got Back :' + JSON.stringify(cb));
          }
            resolve({ "xTransactionRef": myHarvestID, "status": false, "errorCode": cb, "message": harvestOptions[opts.callbackRules.apiFieldName]});
          } else { 
            console.log('Update complete - no error'+  myHarvestID);
            resolve({ "xTransactionRef": myHarvestID, "status": true, "message": harvestOptions[opts.callbackRules.apiFieldName] });
          }
        })
      })
    };

    var actions = transaction.Lines.InvoiceLine.map(fn); // run the function over all items.
    var callback = Promise.all(actions); // pass array of promises
    callback
      .then((results) => {
      console.log('ALL BACK IN callbackHarvest' + JSON.stringify(results));
      if (results) {
	console.log('Have results');
        var hasErrors = _.filter(results, { "status": false });
        if ( hasErrors.length === 0 ) {
          // No errors 
          var result = { "status": true, "warning": false, "results": results };
        } else {
          // We have succesfully completed but one or more errors returned from the API call
          var result = { "status": true, "warning": true, "results": results };
        }
      } else {
          var result = { "status": false, "warning": false, "results": "No results from callout but no errors on callouts!" };
      }
      resolve(result);
    });
  });
}
