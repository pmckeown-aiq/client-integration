var path = require('path');
var appDir = path.dirname(require.main.filename);
console.log('App Dir is ' + appDir);
var _ = require('lodash');
var clone = require('clone');
var fs = require("fs-extra");
// required to evaluate properties in the conf file (dynamically setting variables)
var safeEval = require('safe-eval')
module.exports = processData = function (feedTransactions, opts, options) {
};

processData.prototype.AxiosHarvestInvoices = function(feedTransactions, opts, options ) {
  //console.log('Running Process Data for Axios ' + JSON.stringify(opts) );
  // Array to return from processData
  processedTransactions = [];
  // Sanity Check Variables
  // Count of invoice lines and invoices, sum of NetAmount, TaxAmount and GrossAmount
  // variables
  console.log('reset the control totals');
  var countInvoiceLines = 0;
  var countInvoices = 0;
  var sumNetAmount = 0;
  var sumTaxAmount = 0;
  var sumGrossAmount = 0;
  // Grab out the values in headers where supplied = true

  feedTransactions.forEach(function(apiInvoice) {
    console.log('apiInvoice' + JSON.stringify(apiInvoice))
    myInvoice = {};
    headerValues = _.filter(opts.clientSettings.headerValues, { "supplied" : true });
    headerValues.forEach(function(header) {
    console.log(JSON.stringify(header));
    if ( 'apiInvoice.' + header.value !== undefined ) {
      myInvoice[header.name] = safeEval('apiInvoice.' + header.value, {apiInvoice: apiInvoice})
      }
    });
    // Then grab any with a supplied = false but have a default ...
    headerDefaultedValues = _.filter(opts.clientSettings.headerValues, { "supplied" : false, "default" : true  });
    headerDefaultedValues.forEach(function(myHeaderValue) {
      console.log('SET A DEFAULT HEADER VALUE ' + JSON.stringify(myHeaderValue));
      myInvoice[myHeaderValue.name] = myHeaderValue.defaultValue.set 
    })
    console.log('Invoice from conf ' + JSON.stringify(myInvoice));
    console.log('APInvoice ' + JSON.stringify(apiInvoice.lines));
    console.log('subject is ' + apiInvoice.subject);

    myInvoice.lines = [];
    apiInvoice.lines.forEach(function(line) {
      myLine = {}; // empty the line that we are to construct
      console.log('API Invoice line ' + JSON.stringify(line));
      console.log('My Invoice line ' + JSON.stringify(myLine));
      lineValue = _.filter(opts.clientSettings.lineValues, { "supplied" : true });
      lineValue.forEach(function(myLineValue) {
        console.log('Evaluate ' + myLineValue.name + ' ' + myLineValue.value);
        console.log([myLineValue]);
        console.log(JSON.stringify(line));
        myLine[myLineValue.name] = safeEval('line.' + myLineValue.value, {line : line})
      });
      lineDefaultedValues = _.filter(opts.clientSettings.lineValues, { "supplied" : false, "default" : true  });
      lineDefaultedValues.forEach(function(myLineValue) {
        console.log('SET A DEFAULT LINE VALUE ' + JSON.stringify(myLineValue));
        myLine[myLineValue.name] = myLineValue.defaultValue.set ;
      })
      console.log('My Line is now ' + JSON.stringify(myLine));
      console.log('Original Line is ' + JSON.stringify(line));
      myInvoice.lines.push(myLine);     
    })
    processedTransactions.push(myInvoice)
  })
  console.log('END PROCESS DATA ' + JSON.stringify(processedTransactions));
  // And at the end return the transactions
  return processedTransactions;
}

processData.prototype.AxiosHarvestExpenses = function(feedTransactions, opts, options ) {
  //console.log('Running Process Data for Axios ' + JSON.stringify(opts) );
  // Array to return from processData
  processedTransactions = [];
  // Sanity Check Variables
  // Count of invoice lines and invoices, sum of NetAmount, TaxAmount and GrossAmount
  // variables
  console.log('reset the control totals');
  var countInvoiceLines = 0;
  var countInvoices = 0;
  var sumNetAmount = 0;
  var sumTaxAmount = 0;
  var sumGrossAmount = 0;
  // Grab out the values in headers where supplied = true
  console.log(feedTransactions[0]);
  feedTransactions.forEach(function(apiInvoice) {
    console.log('apiInvoice' + JSON.stringify(apiInvoice))
    myInvoice = {};
    headerValues = _.filter(opts.clientSettings.headerValues, { "supplied" : true });
    headerValues.forEach(function(header) {
      console.log(JSON.stringify(header));
      if ( 'apiInvoice.' + header.value !== undefined ) {
        myInvoice[header.name] = safeEval('apiInvoice.' + header.value, {apiInvoice: apiInvoice})
      }
      //console.log('UPDATED EXT REF ' + myInvoice.ExternalReference);
      //myInvoice.ExternalReference = myInvoice.ExternalReference + ' FROM: ' + apiInvoice.apiOptions.from + ' TO: ' + apiInvoice.apiOptions.to;
      //console.log('UPDATED EXT REF ' + myInvoice.ExternalReference);
    });
    // Then grab any with a supplied = false but have a default ...
    headerDefaultedValues = _.filter(opts.clientSettings.headerValues, { "supplied" : false, "default" : true  });
    headerDefaultedValues.forEach(function(myHeaderValue) {
      console.log('SET A DEFAULT HEADER VALUE ' + JSON.stringify(myHeaderValue));
      myInvoice[myHeaderValue.name] = myHeaderValue.defaultValue.set 
    })
    console.log('Invoice from conf ' + JSON.stringify(myInvoice));
    console.log('APInvoice ' + JSON.stringify(apiInvoice.lines));
    console.log('subject is ' + apiInvoice.subject);

    myInvoice.lines = [];
    apiInvoice.lines.forEach(function(line) {
      myLine = {}; // empty the line that we are to construct
      console.log('API Invoice line ' + JSON.stringify(line));
      console.log('My Invoice line ' + JSON.stringify(myLine));
      lineValue = _.filter(opts.clientSettings.lineValues, { "supplied" : true });
      lineValue.forEach(function(myLineValue) {
        console.log('Evaluate ' + myLineValue.name + ' ' + myLineValue.value);
        console.log([myLineValue]);
        console.log(JSON.stringify(line));
        myLine[myLineValue.name] = safeEval('line.' + myLineValue.value, {line : line})
      });
      lineDefaultedValues = _.filter(opts.clientSettings.lineValues, { "supplied" : false, "default" : true  });
      lineDefaultedValues.forEach(function(myLineValue) {
        console.log('SET A DEFAULT LINE VALUE ' + JSON.stringify(myLineValue));
        myLine[myLineValue.name] = myLineValue.defaultValue.set ;
      })
      console.log('My Line is now ' + JSON.stringify(myLine));
      console.log('Original Line is ' + JSON.stringify(line));
      myInvoice.lines.push(myLine);     
    })
    processedTransactions.push(myInvoice)
  })
  console.log('END PROCESS DATA ' + JSON.stringify(processedTransactions));
  // And at the end return the transactions
  return processedTransactions;
}
