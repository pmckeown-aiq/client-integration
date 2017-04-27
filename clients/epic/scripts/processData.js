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
  console.log('formatDate ' + inputDate);
  //inputDate = '18/10/2016';
  dateParts = inputDate.split('/');
  res = dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0];
  return res;
}

module.exports = processData = function (feedTransactions, opts) {
};


processData.prototype.EpicInvoices = function(feedTransactions, opts ) {
  console.log('Running Process Data for Epic ' + JSON.stringify(opts) );
  // Array to return from processData
  processedTransactions = [];

  // The header for epic defined by the date and the ExtRef column 
  console.log(JSON.stringify(feedTransactions));
  needToPick = []; // array for the pick values to construct a header 
  headerValues = _.filter(opts.clientSettings.headerValues, { "supplied" : true });
  headerValues.forEach(function(myValue) {
    console.log('Evaluate ' + myValue.name + ' ' + myValue.value);
    // strip out the second part as has a prefix 
    var name = myValue.value.split(".")[1];
    needToPick.push(name);
  });
  console.log('needToPick set to ' + JSON.stringify(needToPick));
  // first - "pick" out the ExtRef and the date field from the array  
  //uniqueHeaders = _.map(feedTransactions, _.partialRight(_.pick, [ 'ExtRef', 'Tran_Date', 'CustomerCode' ] ));
  // use the dynamic "needToPick" array (created from the conf invoice Headers supplied = true
  uniqueHeaders = _.map(feedTransactions, _.partialRight(_.pick, needToPick ));
  // then by a bit of magic (not sure how!) we convert that to a unique array by ExtRef and Invoice Date
  uniqueHeaders = _.map( _.uniq( _.map(uniqueHeaders, function(obj){ return JSON.stringify(obj); })), function(obj) { return JSON.parse(obj); });

  console.log('HEADERS ' + JSON.stringify(uniqueHeaders ));
  console.log('HEADERS ' + JSON.stringify( uniqueHeaders.length));
  uniqueHeaders.forEach(function(invoiceHeader) {
    myExtRef = invoiceHeader.ExtRef;
    myTran_Date = invoiceHeader.Tran_Date;
    myTran_Date = invoiceHeader.Tran_Date;
    myInvoices = _.filter(feedTransactions, { ExtRef: myExtRef, Tran_Date: myTran_Date });
    console.log(myExtRef + ' has lines ' + myInvoices.length);
    console.log(JSON.stringify(myInvoices));
    myInvoice = {};
     

    // conf file says which are headerValues - set them
    headerValues = _.filter(opts.clientSettings.headerValues, { "supplied" : true });
    headerValues.forEach(function(myValue) {
      console.log('Evaluate ' + myValue.name + ' ' + myValue.value);
      myInvoice[myValue.name] = safeEval(myValue.value, {invoiceHeader: invoiceHeader})
    });
    console.log('Invoice from conf ' + JSON.stringify(myInvoice));
    // format the invoice datte
    myInvoice.InvoiceDate = formatDate(myInvoice.InvoiceDate);
    myInvoice.OrderDate = formatDate(myInvoice.OrderDate);
    myInvoice.DeliveryDate = formatDate(myInvoice.DeliveryDate);
    myInvoice.lines = [];
    myLine = {}; // empty the line that we are to construct
    myInvoices.forEach(function(invoice) {
      // the conf file should say if it is a line value ...
      console.log('line is ' + JSON.stringify(invoice));
      lineValue = _.filter(opts.clientSettings.lineValues, { "supplied" : true });
      lineValue.forEach(function(myValue) {
        console.log('Evaluate ' + myValue.name + ' ' + myValue.value);
        myLine[myValue.name] = safeEval(myValue.value, {invoice : invoice})
      })
      console.log('My Invoice line ' + JSON.stringify(myLine));
      // clone the line (otherwise next update updates all the lines!) 
      myTempLine = JSON.parse(JSON.stringify(myLine));
      myInvoice.lines.push(myTempLine);     
      console.log('Invoice from conf ' + JSON.stringify(myInvoice));
    })
    // Environment Identifier must be on the header
    myInvoice.EnvironmentIdentifier = myInvoice.lines[0].EnvironmentIdentifier;
    processedTransactions.push(myInvoice)
  })
  // And at the end return the transactions
  return processedTransactions;
}

processData.prototype.SalesReceipts = function(feedTransactions, opts ) {
  console.log('Running Process Data for Epic ' + JSON.stringify(opts) );
  // Array to return from processData
  processedTransactions = [];

  feedTransactions.forEach(function(payment) {
    aiqPayment = {};
    // conf file says which are headerValues - set them
    // No lines on payments
    headerValues = _.filter(opts.clientSettings.headerValues, { "supplied" : true });
    headerValues.forEach(function(myValue) {
      console.log(JSON.stringify(myValue));
      aiqPayment[myValue.name] = safeEval('payment[\'' + myValue.value + '\']', {payment: payment})
    });
    console.log('orig  ' + JSON.stringify(payment));
    console.log('aiq  ' + JSON.stringify(aiqPayment));
    // format the invoice date
    aiqPayment.PaymentDate = formatDate(aiqPayment.PaymentDate);
    // some payments are coming across as 0 
    if ( aiqPayment.PaymentAmount !== 0 ) { 
      processedTransactions.push(aiqPayment);
    }
  })
  // And at the end return the transactions
  return processedTransactions;
}
