var path = require('path');
var appDir = path.dirname(require.main.filename);
console.log('App Dir is ' + appDir);
var _ = require('lodash');
var clone = require('clone');
var fs = require("fs-extra");
// required to evaluate properties in the conf file (dynamically setting variables)
var safeEval = require('safe-eval');
// Kefron - Testing - attach as excel
var json2xls = require('json2xls');

module.exports = processData = function (feedTransactions, opts) {
};

// Bespoke to customer - depends on the dates in the input data
// Pass in a date in the format they use and return it as YYYY-MM-DD
function formatDate(inputDate) {
  //inputDate = '20161031';
  stringDate = inputDate.toString();
  p1 = stringDate.substring(0,4) 
  p2 = stringDate.substring(4,6);
  p3 = stringDate.substring(6,8);
  res = p1 + '-' + p2 + '-' + p3
  return res;
}

processData.prototype.RSSQLInvoices = function(feedTransactions, opts ) {
  console.log('Running Process Data for Kefron ' + JSON.stringify(opts) );
  // Array to return from processData
  processedTransactions = [];
  // Sanity Check Variables
  // Count of invoice lines and invoices, sum of NetAmount, TaxAmount and GrossAmount
  // variables
  console.log('reset the control totals');
  // Grab out the values in headers where supplied = true

  // The file comes across with TH for headers, followed by TL for lines
  myInvoice = {};
  // Lines with a TH in "Identifier" are header lines, lines with a TL are invoice lines.
  // For a line the reference is in Reference, for a header it is in Inv_Or_GL
  // first step - filter headers and lines ...
  // Identifier is in "field1" 
  // we will rename things - so call the arrays "unnamedXXXX"
  unnamedHeaders = _.filter(feedTransactions, { field1: "TH" });
  unnamedLines = _.filter(feedTransactions, { field1: "TL" });

  console.log('Header Count: ' + unnamedHeaders.length)
  console.log('Liner Count: ' + unnamedLines.length)
  // format the arrays (Kefron comes with no headers ...
  var invoiceHeaders = unnamedHeaders.map(function(obj) {
    return {
      CustomerCode: obj.field3,
      // this invoice number may be the ExternalReference (or may not be - as we bunch up by customer to create a single invoice
      ExternalReference: obj.field4,
      Notes: obj.field5, 
      InvoiceDate: obj.field7,
      OrderNumber: obj.field8,
      AccountName: obj.field10,
      AccountAddress1: obj.field11,
      AccountAddress2: obj.field12,
      City: obj.field13,
      County_State: "",
      PostCode: "",
      Country: obj.field21,
      TaxAmount: obj.field17,
      LineDataRange: obj.field6
    }
  })

  var invoiceLines = unnamedLines.map(function(obj) {
    return {
      ExternalReference: obj.field2,
      GLAccountCode: obj.field4,
      StockItemDescription: (obj.field13.replace(/ /g,";") + ";" + obj.field9).trim(),
      DepartmentID: obj.field12 + "-" + obj.field11 ,
      TaxCode: obj.field14,
      StockItemPrice: obj.field15,
      InvoicedQuantity: obj.field16,
      NetAmount: obj.field7
    }
  })
  console.log('A header' + JSON.stringify(invoiceHeaders[0]));
  console.log('A Line' + JSON.stringify(invoiceLines[0]));
  invoiceHeaders.forEach(function(invoice) {
    invoice.InvoiceDate = formatDate(invoice.InvoiceDate);
    invoice.CreationDate = invoice.InvoiceDate;
    invoice.DeliveryDate = invoice.InvoiceDate;
    invoice.OrderDate = invoice.InvoiceDate;
    // Now go and grab the headers for the customer
    // Now filter out the lines for this reference number
    invoice.lines = _.filter(invoiceLines, { ExternalReference : invoice.ExternalReference });
    // Add the date range to the first line ...
    if ( invoice.lines.length > 0 ) {
      invoice.lines[0].Notes = invoice.LineDataRange;
    }
    invoice.NetAmount = _.sumBy(invoice.lines, 'NetAmount');
    invoice.NetAmount =  parseFloat(invoice.NetAmount).toFixed(2);
    invoice.GrossAmount = (invoice.NetAmount*1) + (invoice.TaxAmount*1);
    invoice.GrossAmount = invoice.GrossAmount.toFixed(2);
    console.log('A single invoice: ' + JSON.stringify(invoice));
    if (opts.processRules.attachDocument.required == true && opts.processRules.attachDocument.processData == true) {
      var attachmentData = safeEval(opts.processRules.attachDocument.attachmentData, { invoice });
      var attachmentFileName = safeEval(opts.processRules.attachDocument.attachmentFileName, { invoice });
      console.log(JSON.stringify(attachmentData));
      var attachment = json2xls(attachmentData);
      console.log('Going to write a file ' + appDir + '/clients/' + opts.clientName + '/data/' + opts.coID + '/' + attachmentFileName + '.' + opts.processRules.attachDocument.attachmentType);
      invoice.AttachDocument = appDir + '/clients/' + opts.clientName + '/data/' + opts.coID + '/' + attachmentFileName  + '.' + opts.processRules.attachDocument.attachmentType;
      console.log('invoice attachment ' + invoice.AttachDocument);
      fs.writeFile(appDir + '/clients/' + opts.clientName + '/data/' + opts.coID + '/' + attachmentFileName  + '.' + opts.processRules.attachDocument.attachmentType, attachment, 'binary', function (err) {
        if (err) {
          console.log('Error in writeFiles' + JSON.stringify(err));
          throw new err;
        }
      });
    }
    processedTransactions.push(invoice);
  });
  //console.log(JSON.stringify(processedTransactions));
  // And at the end return the transactions
  //console.log(JSON.stringify(processedTransactions));
  return processedTransactions;
}

processData.prototype.KDCScanningInvoices = function(feedTransactions, opts ) {
  console.log('Running Process Data for Kefron ' + JSON.stringify(opts) );
  // Array to return from processData
  processedTransactions = [];
  // Sanity Check Variables
  // Count of invoice lines and invoices, sum of NetAmount, TaxAmount and GrossAmount
  // variables
  
  mySuppliedHeaders = _.filter(opts.clientSettings.headerValues, { "supplied": true });
  mySuppliedLines = _.filter(opts.clientSettings.lineValues, { "supplied": true });
  // 
  myUniqueReferences = _.chain(feedTransactions).map(function(item) { return item['Reference'] }).uniq().value();
  myUniqueReferences.forEach(function(ref) {
    myLines = _.filter(feedTransactions, { "Reference": ref});
    invoice = {};
    mySuppliedHeaders.forEach(function(headerVal) {
      invoice[headerVal.name] = safeEval( 'head[\'' + headerVal.value + '\']', {head : myLines[0] });
    }) ;
    invoice.lines = [];
    myLines.forEach(function(myLine) {
      newLine = {};
      mySuppliedLines.forEach(function(lineVal) { 
        newLine[lineVal.name] = safeEval( 'line[\'' + lineVal.value + '\']', {line : myLine });
      });
      invoice.lines.push(newLine);
    });
    console.log('A single invoice: ' + JSON.stringify(invoice));
    processedTransactions.push(invoice);
  })
  // And at the end return the transactions
  return processedTransactions;
}

processData.prototype.LightSpeedInvoices = function(feedTransactions, opts ) {
  console.log('Running Process Data for Kefron ' + JSON.stringify(opts) );
  // Array to return from processData
  processedTransactions = [];
  // Sanity Check Variables
  // Count of invoice lines and invoices, sum of NetAmount, TaxAmount and GrossAmount
  // variables
  
  mySuppliedHeaders = _.filter(opts.clientSettings.headerValues, { "supplied": true });
  mySuppliedLines = _.filter(opts.clientSettings.lineValues, { "supplied": true });
  // 
  myUniqueReferences = _.chain(feedTransactions).map(function(item) { return item['REFERENCE'] }).uniq().value();
  myUniqueReferences.forEach(function(ref) {
    myLines = _.filter(feedTransactions, { "REFERENCE": ref});
    invoice = {};
    mySuppliedHeaders.forEach(function(headerVal) {
      invoice[headerVal.name] = safeEval( 'head[\'' + headerVal.value + '\']', {head : myLines[0] });
    }) ;
    invoice.lines = [];
    myLines.forEach(function(myLine) {
      newLine = {};
      mySuppliedLines.forEach(function(lineVal) { 
        newLine[lineVal.name] = safeEval( 'line[\'' + lineVal.value + '\']', {line : myLine });
      });
      invoice.lines.push(newLine);
    });
    console.log('A single invoice: ' + JSON.stringify(invoice));
    processedTransactions.push(invoice);
  })
  // And at the end return the transactions
  return processedTransactions;
}

processData.prototype.PayrollImport = function(feedTransactions, opts ) {
  console.log('Running Process Data for Kefron ' + JSON.stringify(opts) );
  // Array to return from processData
  processedTransactions = [];

  // format the arrays (Kefron comes with no headers ...
  var transactions = feedTransactions.map(function(obj) {
    return {
      InternalReference: obj.field4,
      ExternalReference: obj.field5,
      TransactionDate: obj.field4.substr(6,4) + '-' + obj.field4.substr(3,2) + '-' + obj.field4.substr(0,2),
      DepartmentID: obj.field16.substr(0,3) + '-' + obj.field16.substr(3,3),
      GLAccountCode: obj.field18,
      Description: obj.field20,
      Amount: obj.field22 - obj.field23
    }
  })
  // The file will load as one single journal - so there is not really a header
  // Column 5 gives us the External Reference so want to get a list of "unique references
  myUniqueReferences = _.chain(transactions)
    .uniqBy('ExternalReference','TransactionDate')
    .map('ExternalReference','TransactionDate')
    .value()
  console.log(JSON.stringify(myUniqueReferences));
  myUniqueReferences.forEach(function(ExtRef) {
    myJournal = {};
    myJournal.ExternalReference = ExtRef.replace(/Unposted Accounts : /g, '');
    myLines = _.filter(transactions, { ExternalReference : ExtRef });
    myJournal.TransactionDate = myLines[0].TransactionDate;
    myJournal.InternalReference = myLines[0].InternalReference;
    // Array for lines
    myJournal.lines = [];
    myLines.forEach(function(v){ 
      delete v.InternalReference;
      delete v.ExternalReference;
      delete v.TransactionDate;
      delete v.$$hashKey;
      myJournal.lines.push(v); 
    });	  
    console.log(JSON.stringify(myJournal));
    processedTransactions.push(myJournal);
  }); // end the loop through headers
  return processedTransactions;
}
