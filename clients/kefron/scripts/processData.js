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

module.exports = processData = function (feedTransactions, opts, options) {
};

// Bespoke to customer - depends on the dates in the input data
// Pass in a date in the format they use and return it as YYYY-MM-DD
function formatDate(inputDate) {
  if ( typeof inputDate !== 'undefined' ) {
    if ( typeof inputDate !== 'string' ) {
      inputDate = inputDate.toString();
    } 
    // Sometimes dates are DD/MM/YY and other times DD/MM/YYYY
    if ( inputDate.length === 10 ) { // have YYYY
      p1 = inputDate.substr(6,4); // year
    } else {
      p1 = '20' + inputDate.substr(6,2); // year
    }
    p2 = inputDate.substr(3,2); // month
    p3 = inputDate.substr(0,2); // day
    res = p1 + '-' + p2 + '-' + p3
    return res;
  }
}

// RSSQL Date format is different!
function formatDateRSS(inputDate) {
  if ( typeof inputDate !== 'undefined' ) {
    if ( typeof inputDate !== 'string' ) {
      inputDate = inputDate.toString();
    } 
    // dates are YYYYMMDD
    p1 = inputDate.substr(0,4); // year
    p2 = inputDate.substr(4,2); // month
    p3 = inputDate.substr(6,2); // day
    res = p1 + '-' + p2 + '-' + p3
    return res;
  }
}
function isValidDate(inputDate) {
  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  return inputDate.match(regEx) != null;
}
processData.prototype.RSSQLInvoices = function(feedTransactions, opts, options ) {
  console.log('Running Process Data for Kefron ' + JSON.stringify(options) );
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
      SummarySubAccount: obj.field5, // we will also use field 5 to summarise invoices where the type is 3 ...
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
      LineDataRange: obj.field6,
      SummationType: obj.field20, // the SummationType - type used for summary for this invoice
      ShipmentViaID: obj.field20, // the SummationType - type used for summary for this invoice
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
      InvoicedQuantity: parseFloat(obj.field16),
      StockItemID: obj.field17.substr(0, obj.field17.indexOf('-')), // assumed this is the right code - column Q - take the first part to the "-" , 
      NetAmount: parseFloat(obj.field7),
      //WorkOrder: obj.field13 // temporary field needed to summarise data by ...
    }
  })
  console.log('A header' + JSON.stringify(invoiceHeaders[0]));
  console.log('A Line' + JSON.stringify(invoiceLines[0]));
  invoiceHeaders.forEach(function(invoice) {
    invoice.InvoiceDate = formatDateRSS(invoice.InvoiceDate);
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
    // Summarising of Invoices 
    // Type 1 - Summarise the invoice - by Product Code (Column Q), StockItemPrice (Column O) and work order (column M)
    // Type 2 and Type 3 - for test summarise by the same but enter one invoice for each sub account - Column E. The method of sending the invoices (consolidated format or seperate invoices) to be dealt with at reporting
    // The "type" is to be recorded on the ShipmentViaID field on the invoice
    // TO DO - the Customer Account is to have the GroupID GrpID field updated to store the "type"
    console.log(invoice.ExternalReference + ' SHOULD BE SUMMARISED BY ' + invoice.SummationType);
    invoice.NetAmount = _.sumBy(invoice.lines, 'NetAmount');
    invoice.NetAmount =  parseFloat(invoice.NetAmount).toFixed(2);
    invoice.GrossAmount = (invoice.NetAmount*1) + (invoice.TaxAmount*1);
    invoice.GrossAmount = invoice.GrossAmount.toFixed(2);
    console.log('A single invoice: ' + JSON.stringify(invoice));
    if (opts.processRules.attachDocument.required == true && opts.processRules.attachDocument.processData == true) {
      var attachmentData = safeEval(opts.processRules.attachDocument.attachmentData, { invoice });
      var attachmentFileName = safeEval(opts.processRules.attachDocument.attachmentFileName, { invoice });
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
    // Ok - we have written the attachment - so we need to then summarise the lines ...
    var props = ['ExternalReference', 'GLAccountCode', 'TaxCode' ,'StockItemID', 'StockItemPrice', 'StockItemDescription', 'DepartmentID'];
    // For testing - StockItemDescription is not filtered on 
    var props = ['ExternalReference', 'GLAccountCode', 'TaxCode' ,'StockItemID', 'StockItemPrice', 'DepartmentID'];
    var myFilters = _.map(invoice.lines,_.partialRight(_.pick, props));
    var uniqueFilters = _.uniqWith(myFilters,  _.isEqual);
    console.log('I have FILTERS ' + myFilters.length);
    console.log('I have UNIQUE FILTERS ' + uniqueFilters.length);
    console.log('UNIQUE FILTERS ' + JSON.stringify(uniqueFilters));
    console.log('MY FILTERS ' + JSON.stringify(myFilters));
    summaryLines = []; // empty array to store summary lines
    _.forEach(uniqueFilters, function(filter) {
      myLines = _.filter(invoice.lines, filter);
      filter.NetAmount = _.sumBy(myLines, 'NetAmount');
      filter.InvoicedQuantity = _.sumBy(myLines, 'InvoicedQuantity');
      filter.StockItemDescription = 'Summarised Line';
      console.log('For ' + JSON.stringify(filter) + ' as a summary')
      // push the filtered object to the summaryLines array
      summaryLines.push(filter);
    })
    // replace the original invoice lines with the summary
    invoice.lines = [];
    invoice.lines = summaryLines;
    // summary Totals (to compare to originals as a check) 
    newTotals = {};
    newTotals.NetAmount = _.sumBy(summaryLines, 'NetAmount');
    newTotals.NetAmount =  parseFloat(newTotals.NetAmount).toFixed(2);
    newTotals.TaxAmount = _.sumBy(summaryLines, 'TaxAmount');
    newTotals.TaxAmount =  parseFloat(newTotals.TaxAmount).toFixed(2);
    // compare the NetAmount for newTotals and invoice.NetAmount
    if ( newTotals.NetAmount !== invoice.NetAmount ) {
      // mark the invoice
      invoice.updateStatus = { 'status': "danger", 'error':'Summary Net Total Did Not Match Original Net Total' };
    }
    if ( newTotals.TaxAmount !== invoice.TaxAmount ) {
      // mark the invoice - COMMENTED OUT AS FOR REDUCED LINES USED FOR TESTING THIS FAILS - AS WE HAVE CUT OUT SOME LINES AND THE TAX AMOUNT IS FROM THE HEADER (WHICH WOULD BE FOR ALL LINES - NOT THE REDUCED LINES!) 
      //invoice.updateStatus = { 'status': "danger", 'error':'Summary Tax Total Did Not Match Original Tax Total' };
    }
    processedTransactions.push(invoice);
  });
  //console.log(JSON.stringify(processedTransactions));
  // And at the end return the transactions
  //console.log(JSON.stringify(processedTransactions));
  return processedTransactions;
}

processData.prototype.ScanningInvoices = function(feedTransactions, opts, options ) {
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
    invoice.NetAmount = 0;
    invoice.GrossAmount = 0;
    invoice.TaxAmount = 0;
    mySuppliedHeaders.forEach(function(headerVal) {
      invoice[headerVal.name] = safeEval( 'head[\'' + headerVal.value + '\']', {head : myLines[0] });
    }) ;
    // External Ref is just a period number
    invoice.ExternalReference = 'Period:' + invoice.ExternalReference;
    invoice.lines = [];
    myLines.forEach(function(myLine) {
      newLine = {};
      mySuppliedLines.forEach(function(lineVal) { 
        newLine[lineVal.name] = safeEval( 'line[\'' + lineVal.value + '\']', {line : myLine });
      });
      // Net Amount not supplied
      newLine.NetAmount = newLine.InvoicedQuantity * newLine.StockItemPrice;
      newLine.NetAmount = (newLine.NetAmount.toFixed(2)/1);
      //invoice.NetAmount += newLine.NetAmount;
      invoice.lines.push(newLine);
    });
    console.log('A single invoice: ' + JSON.stringify(invoice));
    invoice.InvoiceDate = formatDate(invoice.InvoiceDate);
    if ( !isValidDate(invoice.InvoiceDate) )  {
      invoice.updateStatus = { 'status': 'warning', 'error': invoice.ExternalReference + ' INVOICE DATE IS NOT A VALID DATE' };
    } // all other dates come from the same place so no need to validate
    invoice.CreationDate = formatDate(invoice.CreationDate);
    invoice.DeliveryDate = formatDate(invoice.DeliveryDate);
    invoice.OrderDate = formatDate(invoice.OrderDate);
    processedTransactions.push(invoice);
  })
  // And at the end return the transactions
  return processedTransactions;
}

processData.prototype.PayrollImport = function(feedTransactions, opts, options ) {
  console.log('Running Process Data for Kefron ' + JSON.stringify(opts) );
  console.log('Running Process Data for Kefron ' + JSON.stringify(options) );
  // Array to return from processData
  processedTransactions = [];

  // format the arrays (Kefron comes with no headers ...
  var transactions = feedTransactions.map(function(obj) {
    return {
      DepartmentID: obj.field16.substr(0,3) + '-' + obj.field16.substr(3,3),
      GLAccountCode: obj.field18,
      Description: obj.field20,
      Amount: obj.field22 - obj.field23
    }
  })
  // The file will load as one single journal - so there is not really a header
  myJournal = {};
  myJournal.ExternalReference = options.data.type + ':' + options.data.file.substr(0,4) + '-' + options.data.file.substr(4,2) + '-' + options.data.file.substr(6,2)
      // The journal date comes from the file name! 
  myJournal.TransactionDate = options.data.file.substr(0,4) + '-' + options.data.file.substr(4,2) + '-' + options.data.file.substr(6,2)
  myJournal.InternalReference = myJournal.ExternalReference;
  if ( !isValidDate(myJournal.TransactionDate) )  {
    myJournal.updateStatus = { 'status': 'warning', 'error': myJournal.TransactionDate + ' IS NOT A VALID DATE' };
  }
  //myJournal.InternalReference = myLines[0].InternalReference;
  // Array for lines
  myJournal.lines = [];
  transactions.forEach(function(v){ 
    delete v.$$hashKey;
    myJournal.lines.push(v); 
  });	  
  console.log(JSON.stringify(myJournal));
  processedTransactions.push(myJournal);
  return processedTransactions;
}
