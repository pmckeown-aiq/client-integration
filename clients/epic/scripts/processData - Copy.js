var path = require('path');
var appDir = path.dirname(require.main.filename);
console.log('App Dir is ' + appDir);
var _ = require('lodash');
var clone = require('clone');
var fs = require("fs");
// required to evaluate properties in the conf file (dynamically setting variables)
var safeEval = require('safe-eval')

// Bespoke to customer - depends on the dates in the input data
// Pass in a date in the format they use and return it as YYYY-MM-DD
function formatDate(inputDate) {
  //inputDate = '18/10/2016';
  dateParts = inputDate.split('/');
  res = dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0];
  return res;
}

module.exports = processData = function (feedTransactions, opts) {
};


processData.prototype.BatchInvoices = function(feedTransactions, opts ) {
    console.log('Running Process Data for Epic ' + JSON.stringify(opts) );
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
	
    // A batch invoice will have a header and many lines (odd but true)
    

    feedTransactions.forEach(function(invoice) {
      // EPIC CSV File - does not have lines
      // Batch invoice does expect a "header" and lines (yes even though only "flat" invoice object SOAP API wants as header and lines 
      myInvoice = {};
      console.log('feedTransactions Invoice ' + JSON.stringify(invoice));

      // conf file says which are headerValues - set them
      headerValues = _.filter(opts.headerValues, { "supplied" : true });
      headerValues.forEach(function(header) {
	console.log(JSON.stringify(header));
	myInvoice[header.name] = safeEval(header.value, {invoice: invoice})
      });
      console.log('Invoice from conf ' + JSON.stringify(myInvoice));
      // format the invoice datte
      myInvoice.InvoiceDate = formatDate(myInvoice.InvoiceDate);
      myInvoice.lines = [];
      myLine = {}; // empty the line that we are to construct
      // the conf file should say if it is a line value ...
      lineValue = _.filter(opts.lineValues, { "supplied" : true });
      lineValue.forEach(function(myLineValue) {
        console.log('Evaluate ' + myLineValue.name + ' ' + myLineValue.value);
	myLine[myLineValue.name] = safeEval(myLineValue.value, {invoice : invoice})
      });
      console.log('My Invoice line ' + JSON.stringify(myLine));
      myInvoice.lines.push(myLine);     
      console.log('Invoice from conf ' + JSON.stringify(myInvoice));
      processedTransactions.push(myInvoice)
    })
    console.log(JSON.stringify(processedTransactions));
    // And at the end return the transactions
    return processedTransactions;
  }
