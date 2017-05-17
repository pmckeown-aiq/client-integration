var path = require('path');
var appDir = path.dirname(require.main.filename);
console.log('App Dir is ' + appDir);
var _ = require('lodash');
var fs = require("fs-extra");
// required to evaluate properties in the conf file (dynamically setting variables)
var safeEval = require('safe-eval')

// Bespoke to customer - depends on the dates in the input data
// Pass in a date in the format they use and return it as YYYY-MM-DD
function formatDate(inputDate) {
  if ( typeof inputDate !== 'undefined' ) {
    if ( typeof inputDate !== 'string' ) {
      inputDate = inputDate.toString();
    }
    dateParts = inputDate.split('/');
    res = dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0];
    return res;
    return res;
  }
}

function isValidDate(inputDate) {
  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  return inputDate.match(regEx) != null;
}

module.exports = processData = function (feedTransactions, opts, options) {
};


processData.prototype.ConstructionInvoices = function(feedTransactions, opts, options ) {
  console.log('Running Process Data for AuraCare ' + JSON.stringify(opts) );
  // Array to return from processData
  processedTransactions = [];
  controlAccounts = ["1100", "2100"]; // feed has control and actual postings - we need to ignore control accounts
  taxAccounts = ["2200", "2201"]; // tax control accounts - retain values (may use to validate tax postings ... NOT YET IMPLEMENTED - may set tax amount from these 
  headerValues = _.filter(opts.clientSettings.headerValues, { "supplied" : true });
  lineValue = _.filter(opts.clientSettings.lineValues, { "supplied" : true });
  // first - "pick" out the ExtRef and the date field from the array  
  uniqueHeaders = _.uniqBy(_.map(feedTransactions, _.partialRight(_.pick, 'TRAN_NUMBER' )), 'TRAN_NUMBER');
  
  console.log('HEADERS ' + JSON.stringify(uniqueHeaders ));
  console.log('HEADERS ' + JSON.stringify( uniqueHeaders.length));
  uniqueHeaders.forEach(function(uniqueIdentifier) {
    invLines = _.filter(feedTransactions, uniqueIdentifier);
    // Construct an invoice 
    invoice = {};
    headerValues.forEach(function(myValue) {
      console.log('Evaluate ' + myValue.name + ' ' + myValue.value);
      console.log('Evaluate ' + JSON.stringify(invLines[0]));
      // Not really got header and lines - just use the first line to get header details ..
      invoice[myValue.name] = safeEval(myValue.value, {header : invLines[0]})
    });
    // format dates (InvoiceDate and OrderDate)
    invoice.InvoiceDate = formatDate(invoice.InvoiceDate);
    invoice.OrderDate = formatDate(invoice.OrderDate);
    invoice.CreationDate = formatDate(invoice.CreationDate);
    invoice.DeliveryDate = formatDate(invoice.DeliveryDate);
    console.log('header is ' + JSON.stringify(invoice));
    invoice.lines = [];
    invLines.forEach(function(line) {
      var aiqLine = {}; // empty the line that we are to construct
      // the conf file should say if it is a line value ...
      console.log('line is ' + JSON.stringify(line));
      lineValue.forEach(function(myValue) {
        //console.log('Evaluate ' + myValue.name + ' ' + myValue.value);
        aiqLine[myValue.name] = safeEval(myValue.value, {line : line})
      });
      invoice.lines.push(aiqLine);
    });
    // Save off the control lines 
    controlLines = _(invoice.lines)
      .keyBy('GLAccountCode') 
      .at(controlAccounts)
      .value();
    _.reject(controlLines, _.isNull);
    // And the tax lines 
    taxLines = _(invoice.lines)
      .keyBy('GLAccountCode') 
      .at(taxAccounts)
      .value();
    // Remove "null" in array (when a code is not found it gets added ...
    controlLines = _.compact(controlLines);
    taxLines = _.compact(taxLines);

    console.log('CONTROL LINES ' + JSON.stringify(controlLines));
    console.log('TAX LINES ' + JSON.stringify(taxLines));
    invoice.lines = _.difference(invoice.lines, controlLines)
    invoice.lines = _.difference(invoice.lines, taxLines)
    console.log('ALL LINES ' + JSON.stringify(invoice.lines));
    processedTransactions.push(invoice)
  });
  console.log(JSON.stringify(processedTransactions));
  // And at the end return the transactions
  return processedTransactions;
}

