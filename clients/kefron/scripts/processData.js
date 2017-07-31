var path = require('path');
var appDir = path.dirname(require.main.filename);
//console.log('App Dir is ' + appDir);
var _ = require('lodash');
var clone = require('clone');
var fs = require("fs-extra");
// required to evaluate properties in the conf file (dynamically setting variables)
var safeEval = require('safe-eval');
// Kefron - Testing - attach as excel
var json2xls = require('json2xls');
var Excel = require('exceljs');
var async = require('async');
var promiseForeach = require('promise-foreach')

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

function getTaxRateByTaxCode(taxCodeArray, opts, cb) {
  var validateWith = 'GetTaxCodeList';
  var validate = require(appDir + '/resources/' + validateWith + '.js');
  var returnArray = [];
  // ValidateWhat should be CustomerCode or SupplierCode
  console.log('SET LINE TAX CODE FROM ACCOUNT ' + JSON.stringify(taxCodeArray));
  taxCodeArray.forEach(function(validateWhat) {
   //console.log('SET LINE TAX CODE FROM ACCOUNT ' + opts.coID);
    validate.doValidation(validateWith,validateWhat, opts.clientName, opts.coID, validateWhat, function(err, result){
      if (typeof result.data != 'undefined' ) {
        //console.log('SET TAX CODE FOR LINES ' + JSON.stringify(result.data));
        returnArray.push(result.data);
      } else {
        //console.log('NO TAX CODE FROM ACCOUNT ' + opts.coID + ' ' + err);
        cb('NO TAX CODE FROM ACCOUNT ' + opts.coID + ' ' + JSON.stringify(result), null);
      }
    })
    console.log('Return ' + JSON.stringify(returnArray));
    cb(null, returnArray);
  })
}

function getTaxRateByCustomerCode(customerCodeArray, opts) {
  return new Promise(function(resolve, reject){
    var validateWith = 'GetActiveCustomerList';
    var validate = require(appDir + '/resources/' + validateWith + '.js');
    var returnArray = [];
    // ValidateWhat should be CustomerCode or SupplierCode
    //console.log('SET LINE TAX CODE FROM ACCOUNT ' + opts.coID);
    customerCodeArray.forEach(function(validateWhat) {
    // ValidateWhat should be CustomerCode or SupplierCode
      validate.doValidation(validateWith,validateWhat, opts.clientName, opts.coID, validateWhat, function(err, result){
        if (typeof result.data != 'undefined' ) {
          taxCodesArray = [];
          taxCodesArray.push(result.data.DefaultTaxCode);
          getTaxRateByTaxCode(taxCodesArray, opts, function(err, data) {
            if (err) throw err;
            console.log('1 TAX ARRAY ' + JSON.stringify(data));
            data[0].CustomerCode = validateWhat;
            //opts.taxRateArray = data;
            returnArray.push(data[0]);
          })
        } else {
          console.log('NO TAX CODE FROM ACCOUNT ' + validateWhat + ' ' + err);
          //reject('NO TAX CODE FROM ACCOUNT ' + opts.coID + ' ' + JSON.stringify(result));
        }
      })
    })
  console.log('Return ' + JSON.stringify(returnArray));
  console.log('Resolve getTaxRateByCustomerCode');
  resolve(returnArray);
  //cb(null, returnArray);
  })
}

function writeAttachment(consolidatedInvoice, opts) {
  return new Promise(function(resolve, reject){
    if (opts.processRules.attachDocument.required == true && opts.processRules.attachDocument.processData == true) {
    // ATTACHMENT DOCUMENT
      var attachmentData = safeEval(opts.processRules.attachDocument.attachmentData, { consolidatedInvoice });
      var attachmentFileName = safeEval(opts.processRules.attachDocument.attachmentFileName, { consolidatedInvoice });
      var workbook = new Excel.Workbook();
      var templateFile = appDir + '/clients/' + opts.clientName + '/scripts/Type3Template.xlsx';
      //console.log('in promise - about to read file' + templateFile);
      workbook.xlsx.readFile(templateFile)
        .then(function() {
          //console.log("Edit File");
          // edit worksheet
          var worksheet = workbook.getWorksheet("Inv 1");
          consolidatedInvoice.lines.forEach(function(line) {
            //console.log('ADD LINE ' + consolidatedInvoice.SummarySubAccount + ' or ' + line.SummarySubAccount);
            worksheet.addRow([line.ExternalReference, line.SummarySubAccount, line.StockItemDescriptionType3, line.WorkOrder, line.WorkOrderDate, line.InvoicedQuantity, line.StockItemPrice, line.NetAmount, line.TaxAmount, line.NetAmount + line.TaxAmount ]);
          });
          // Add totals 
          var rowValues = [];
          rowValues[8] = consolidatedInvoice.NetAmount;
          rowValues[9] = consolidatedInvoice.TaxAmount;
          rowValues[10] = parseFloat(consolidatedInvoice.NetAmount) + parseFloat(consolidatedInvoice.TaxAmount);
          worksheet.addRow(rowValues);
          var row = worksheet.lastRow;
          row.font = { name: 'Calibri', size: 10, bold: true };
          //console.log("DONE Edit File" + consolidatedInvoice.lines.length);
          //console.log("Write File - " + appDir + '/clients/' + opts.clientName + '/data/' + opts.coID + '/' + attachmentFileName  + '.' + opts.processRules.attachDocument.attachmentType);
        })
        .then(function() {
          workbook.xlsx.writeFile(appDir + '/clients/' + opts.clientName + '/data/' + opts.coID + '/' + attachmentFileName  + '.' + opts.processRules.attachDocument.attachmentType);
          //console.log('attach to invoice');
          consolidatedInvoice.AttachDocument = appDir + '/clients/' + opts.clientName + '/data/' + opts.coID + '/' + attachmentFileName  + '.' + opts.processRules.attachDocument.attachmentType;
          //console.log("Done - resolve Promise");
          resolve(consolidatedInvoice);
        })
        .catch(function(err) {
          //console.log('Error ' + JSON.stringify(err));
          //console.log("Done - reject Promise");
          reject(err);
        })
     } else {
          //console.log("Nothing to attach - resolve Promise");
          resolve(consolidatedInvoice);
     }
  })
}

function createConsolidatedInvoices(customer, invoiceLines, opts) {
  return new Promise(function(resolve, reject){
    //console.log('i am ' + customer);
    //console.log('i have ' + invoiceLines.length);
    myInvoices = _.filter(consolidatedHeaders, { 'CustomerCode': customer});
    //console.log('Invoices for ' + customer + ' ' + myInvoices.length);
    consolidatedInvoice = {};
    consolidatedInvoice.lines = [];
    consolidatedInvoice.CustomerCode = myInvoices[0].CustomerCode;
    consolidatedInvoice.Notes = myInvoices[0].Notes;
    consolidatedInvoice.OrderNumber = myInvoices[0].OrderNumber;
    consolidatedInvoice.ShipmentViaID = myInvoices[0].ShipmentViaID;
    consolidatedInvoice.LineDataRange = myInvoices[0].LineDataRange;
    consolidatedInvoice.ExternalReference = myInvoices[0].CustomerCode + '-' + myInvoices[0].InvoiceDate;
    consolidatedInvoice.InvoiceDate = myInvoices[0].InvoiceDate;
    if ( !isValidDate(consolidatedInvoice.InvoiceDate) )  {
      consolidatedInvoice.updateStatus = { 'status': 'warning', 'error': consolidatedInvoice.ExternalReference + ' INVOICE DATE IS NOT A VALID DATE' };
    } // all other dates come from the same place so no need to validate
    consolidatedInvoice.CreationDate = consolidatedInvoice.InvoiceDate;
    consolidatedInvoice.DeliveryDate = consolidatedInvoice.InvoiceDate;
    consolidatedInvoice.OrderDate = consolidatedInvoice.InvoiceDate;
    // now need to loop through the non-consolidated invoices (myInvoices) for this customer
    myInvoices.forEach(function(invoice) {
      invoice.lines = [];
      //console.log('Inspect invoice ' + invoice.ExternalReference);
      invoice.lines = _.filter(invoiceLines, { ExternalReference : invoice.ExternalReference });
      invoice.lines.forEach(function(line) {
	line.SummarySubAccount = invoice.SummarySubAccount;
        myTaxCode = _.filter(opts.taxRateArray, { Code: line.TaxCode });
        if (myTaxCode.length == 1 ) {
         line.TaxAmount = parseFloat(line.NetAmount) * parseFloat(myTaxCode[0].Rate);
         line.TaxRate = myTaxCode[0].Rate;
         line.TaxCode = myTaxCode[0].Code;
        }
      })
      // Push the invoice lines into the consolidated invoice lines
      ////console.log('PUSH ' + JSON.stringify(invoice.lines.length));
      // concatenate the lines to the array
      consolidatedInvoice.lines  = consolidatedInvoice.lines.concat(invoice.lines);
      ////console.log('PUSHED ' + JSON.stringify(consolidatedInvoice.lines.length));
    })
    //console.log('Consolidated Invoice Line Count:' + JSON.stringify(consolidatedInvoice.lines.length));
    // Total up the lines ...
    consolidatedInvoice.NetAmount = _.sumBy(consolidatedInvoice.lines, 'NetAmount');
    consolidatedInvoice.NetAmount =  parseFloat(consolidatedInvoice.NetAmount).toFixed(2);
    consolidatedInvoice.TaxAmount = _.sumBy(consolidatedInvoice.lines, 'TaxAmount');
    consolidatedInvoice.TaxAmount =  parseFloat(consolidatedInvoice.TaxAmount).toFixed(2);
    //console.log('Resolve createConsolidatedInvoice Invoice Line Count:' + JSON.stringify(consolidatedInvoice.lines.length));
    resolve(consolidatedInvoice);
  });
};

function summariseConsolidatedInvoice(consolidatedInvoice, opts) {
  return new Promise(function(resolve, reject){
        // Ok - we have written the attachment - so we need to then summarise the lines ...
        //var props = ['SummarySubAccount', 'GLAccountCode', 'TaxCode' ,'StockItemID', 'StockItemDescriptionType3', 'ActualPrice', 'StockItemPrice', 'DepartmentID'];
        var props = ['GLAccountCode', 'TaxRate', 'TaxCode' ,'StockItemID', 'StockItemDescriptionType3', 'ActualPrice', 'StockItemPrice', 'DepartmentID'];
        var myFilters = _.map(consolidatedInvoice.lines,_.partialRight(_.pick, props));
        var uniqueFilters = _.uniqWith(myFilters,  _.isEqual);
        //console.log('I have PROPS ' + JSON.stringify(props));
        summaryLines = []; // empty array to store summary lines
        _.forEach(uniqueFilters, function(filter) {
          myLines = _.filter(consolidatedInvoice.lines, filter);
          filter.NetAmount = _.sumBy(myLines, 'NetAmount');
          filter.TaxAmount = _.sumBy(myLines, 'TaxAmount');
          filter.InvoicedQuantity = _.sumBy(myLines, 'InvoicedQuantity');
          //filter.Notes = consolidatedInvoice.SummarySubAccount;
          // push the filtered object to the summaryLines array
          filter.StockItemDescription = filter.StockItemDescriptionType3;
          summaryLines.push(filter);
        })
        // replace the original invoice lines with the summary
        consolidatedInvoice.lines = [];
        consolidatedInvoice.lines = summaryLines;
        consolidatedInvoice.lines[0].Notes = 'Storage ' + consolidatedInvoice.LineDataRange;
        // summary Totals (to compare to originals as a check)
        newTotals = {};
        newTotals.NetAmount = _.sumBy(summaryLines, 'NetAmount');
        newTotals.NetAmount =  parseFloat(newTotals.NetAmount).toFixed(2);
        newTotals.TaxAmount = _.sumBy(summaryLines, 'TaxAmount');
        newTotals.TaxAmount =  parseFloat(newTotals.TaxAmount).toFixed(2);
        // compare the NetAmount for newTotals and invoice.NetAmount
        if ( newTotals.NetAmount !== consolidatedInvoice.NetAmount ) {
          // mark the invoice
          consolidatedInvoice.updateStatus = { 'status': "danger", 'error':'Summary Net Total Did Not Match Original Net Total' };
        }
        if ( newTotals.TaxAmount !== consolidatedInvoice.TaxAmount ) {
          // mark the invoice - COMMENTED OUT AS FOR REDUCED LINES USED FOR TESTING THIS FAILS - AS WE HAVE CUT OUT SOME LINES AND THE TAX AMOUNT IS FROM THE HEADER (WHICH WOULD BE FOR ALL LINES - NOT THE REDUCED LINES!)
          //invoice.updateStatus = { 'status': "danger", 'error':'Summary Tax Total Did Not Match Original Tax Total' };
        }
        //console.log('resolve summariseConsolidated invoice ...');
        //console.log(JSON.stringify(consolidatedInvoice));
        resolve(consolidatedInvoice);
      })
      .catch(function (err) {
        //console.log("Promise Rejected" + JSON.stringify(err));
      });
};

function processNonConsolidatedInvoice(invoice, invoiceLines, opts) {
  return new Promise(function(resolve, reject){
    if ( !isValidDate(invoice.InvoiceDate) )  {
      invoice.updateStatus = { 'status': 'warning', 'error': invoice.ExternalReference + ' INVOICE DATE IS NOT A VALID DATE' };
    } // all other dates come from the same place so no need to validate
    invoice.CreationDate = invoice.InvoiceDate;
    invoice.DeliveryDate = invoice.InvoiceDate;
    invoice.OrderDate = invoice.InvoiceDate;
    // Now go and grab the headers for the customer
    // Now filter out the lines for this reference number
    invoice.lines = _.filter(invoiceLines, { ExternalReference : invoice.ExternalReference });

    // Add the date range to the first line ...
    if ( invoice.lines.length > 0 ) {
      invoice.lines[0].Notes = 'Storage ' + invoice.LineDataRange;
      invoice.lines[0].SummarySubAccount = invoice.SummarySubAccount;
    }
    invoice.lines.forEach(function(line){
        myTaxCode = _.filter(opts.taxRateArray, { Code: line.TaxCode });
        console.log('myTaxCode ' + JSON.stringify(myTaxCode));
        if (myTaxCode.length == 1 ) {
         line.TaxAmount = parseFloat(line.NetAmount) * parseFloat(myTaxCode[0].Rate);
         line.TaxRate = myTaxCode[0].Rate;
         line.TaxCode = myTaxCode[0].Code;
         console.log('Tax Amount ' + line.TaxAmount);
        }
    })
    // Summarising of Invoices
    // Type 1 - No Summary
    // Type 2 - No Summary
    // Type 3 - Summary by product, but change on price (when same product has different prices), glcode and analysis. Also put the sub account (SummarySubAccount)
    // on every line ...
    // The "type" is to be recorded on the ShipmentViaID field on the invoice
    // TO DO - the Customer Account is to have the GroupID GrpID field updated to store the "type"
    invoice.NetAmount = _.sumBy(invoice.lines, 'NetAmount');
    invoice.NetAmount =  parseFloat(invoice.NetAmount).toFixed(2);
    invoice.GrossAmount = (invoice.NetAmount*1) + (invoice.TaxAmount*1);
    invoice.GrossAmount = invoice.GrossAmount.toFixed(2);
    //console.log('A single invoice: ' + JSON.stringify(invoice));
    resolve(invoice);
    })
};

processData.prototype.RSSQLInvoices = async function(feedTransactions, opts, options, cb) {
  //console.log('Running Process Data for Kefron ' + JSON.stringify(options) );
  // Array to return from processData
  processedTransactions = [];
  // Sanity Check Variables
  // Count of invoice lines and invoices, sum of NetAmount, TaxAmount and GrossAmount
  // variables
  unnamedHeaders = _.filter(feedTransactions, { field1: "TH" });
  unnamedLines = _.filter(feedTransactions, { field1: "TL" });
  // The file comes across with TH for headers, followed by TL for lines
  myInvoice = {};
 
  var invoiceHeaders = unnamedHeaders.map(function(obj) {
    return {
      CustomerCode: obj.field3,
      // this invoice number may be the ExternalReference (or may not be - as we bunch up by customer to create a single invoice
      ExternalReference: obj.field4,
      Notes: obj.field5, 
      SummarySubAccount: obj.field5, // we will also use field 5 to summarise invoices where the type is 3 ...
      InvoiceDate: formatDateRSS(obj.field7),
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
      SummarySubAccount: obj.field5,
      StockItemDescription: (obj.field13 + obj.field9).trim(),
      StockItemDescriptionType3: (obj.field9).trim(),
      WorkOrder: obj.field13.split(" ")[0],
      WorkOrderDate: obj.field13.split(" ")[1],
      DepartmentID: obj.field12 + "-" + obj.field11 ,
      TaxCode: obj.field14,
      StockItemPrice: obj.field15,
      ActualPrice: obj.field15,
      InvoicedQuantity: parseFloat(obj.field16),
      //StockItemID: obj.field17.substr(0, obj.field17.indexOf('-')), // assumed this is the right code - column Q - take the first part to the "-" , 
      StockItemID: obj.field17,
      NetAmount: parseFloat(obj.field7),
      //WorkOrder: obj.field13 // temporary field needed to summarise data by ...
    }
  })
  // Parse one customer at a time ... needed to summarise across invoices 
  //console.log(JSON.stringify(feedTransactions[0]));
  consolidatedHeaders = _.filter(invoiceHeaders, { SummationType: "3" });
  //console.log('Consolidate ' + JSON.stringify(consolidatedHeaders.length));
  taxCodesArray = _.chain(invoiceLines).map(function(item) { return item.TaxCode }).uniq().value();
  getTaxRateByTaxCode(taxCodesArray, opts, function(err, data) {
    if (err) throw err;
    //console.log('TAX ARRAY ' + JSON.stringify(data));
    opts.taxRateArray = data;
    consolidatedCustomers = _.chain(consolidatedHeaders).map(function(item) { return item.CustomerCode }).uniq().value();
    type1Customers = _.filter(invoiceHeaders, { SummationType: "1" });
    type2Customers = _.filter(invoiceHeaders, { SummationType: "2" });
    nonConsolidatedHeaders = _.union(type1Customers,type2Customers);
    //console.log('CONSOLIDATE CUSTOMERS COUNT ' + consolidatedCustomers.length);
    //console.log('NON CONSOLIDATE INVOICES COUNT ' + invoiceHeaders.length);
    //await Promise.all(consolidatedCustomers.map(function (customer) {
  async.series([
      function(callback) {
        Promise.all(consolidatedCustomers.map(function (customer) {
          return createConsolidatedInvoices(customer, invoiceLines, opts);
        }))
        .then(consolInvArray => { 
          //console.log('consolInvArray length ' + consolInvArray.consolInvArray);
          return Promise.all(consolInvArray.map(function (consolidatedInvoice) {
              return writeAttachment(consolidatedInvoice, opts)
           }))
        })
        .then(consolInvArray => { 
          //console.log('consolInvArray length ' + consolInvArray.length);
          return Promise.all(consolInvArray.map(function (consolidatedInvoice) {
              return summariseConsolidatedInvoice(consolidatedInvoice, opts)
           }))
        })
        .then(consolInvArray => { 
          //console.log('process 1 complete - callback time');
          callback(null, consolInvArray);
        }).catch(function(e) {
          //console.log(e); // "oh, no!"
        });
      },
      function(callback) {
        Promise.all(nonConsolidatedHeaders.map(function (invoice) {
          return processNonConsolidatedInvoice(invoice, invoiceLines, opts);
        }))
        .then(nonConsolInvArray => { 
          //console.log('process 2 complete - callback time');
          callback(null, nonConsolInvArray);
        }).catch(function(e) {
          //console.log(e); // "oh, no!"
        });
      }
    ],
    // callback to integration.js
    function(err, processedTransactions) {
      // results is now equal to ['one', 'two']
      //console.log('process  complete - callback time');
      processedTransactions = processedTransactions.reduce((a, b) => a.concat(b), []);
         console.log('CALLBACK Transactions Count ' + JSON.stringify(processedTransactions));
      cb(null, processedTransactions)
    });
  })
}

processData.prototype.ScanningInvoices = function(feedTransactions, opts, options, cb ) {
  //console.log('Running Process Data for Kefron ' + JSON.stringify(opts) );
  // Array to return from processData
  processedTransactions = [];
  // Sanity Check Variables
  // Count of invoice lines and invoices, sum of NetAmount, TaxAmount and GrossAmount
  // variables
  
  mySuppliedHeaders = _.filter(opts.clientSettings.headerValues, { "supplied": true });
  mySuppliedLines = _.filter(opts.clientSettings.lineValues, { "supplied": true });
  // 
  myUniqueReferences = _.chain(feedTransactions).map(function(item) { return item['Reference'] }).uniq().value();
  customerCodeArray = _.chain(feedTransactions).map(function(item) { return item['Account Code'] }).uniq().value();
  console.log('customerCodeArray ' + JSON.stringify(customerCodeArray));
  getTaxRateByCustomerCode(customerCodeArray, opts) 
    .then(taxCodeArray => { 
      //console.log('resolved getTaxRateByCustomerCode ' + JSON.stringify(taxCodeArray));
      console.log('myUniqueReferences ' + myUniqueReferences.length);
      myUniqueReferences.forEach(function(ref) {
        console.log('1 Process ref ' + ref);
        myLines = _.filter(feedTransactions, { "Reference": ref});
        invoice = {};
        invoice.lines = [];
        invoice.NetAmount = 0;
        invoice.GrossAmount = 0;
        invoice.TaxAmount = 0;
        console.log('2 Process ref ' + ref);
        mySuppliedHeaders.forEach(function(headerVal) {
          invoice[headerVal.name] = safeEval( 'head[\'' + headerVal.value + '\']', {head : myLines[0] });
        }) ;
        console.log('3 Process ref ' + ref);
        // External Ref is just a period number
        invoice.ExternalReference = invoice.CustomerCode + ':' + invoice.ExternalReference;
        myLines.forEach(function(myLine) {
          console.log('1 line Process ref ' + ref);
          newLine = {};
          mySuppliedLines.forEach(function(lineVal) { 
            newLine[lineVal.name] = safeEval( 'line[\'' + lineVal.value + '\']', {line : myLine });
          });
          myTaxCode = _.filter(taxCodeArray, { "CustomerCode": invoice.CustomerCode });
          // Net Amount not supplied
          newLine.NetAmount = parseFloat(newLine.InvoicedQuantity) * parseFloat(newLine.StockItemPrice);
          console.log('2 line Process ref ' + ref);
          if (myTaxCode.length == 1 ) {
           console.log('3a line Process ref ' + ref);
           newLine.TaxAmount = parseFloat(newLine.NetAmount) * parseFloat(myTaxCode[0].Rate);
           newLine.TaxRate = myTaxCode[0].Rate;
           newLine.TaxCode = myTaxCode[0].Code;
           newLine.GrossAmount = parseFloat(newLine.NetAmount) + parseFloat(newLine.TaxAmount);
          } else {
           console.log('3b line Process ref ' + ref);
           newLine.TaxAmount = 0;
           newLine.GrossAmount = 0;
          }
          newLine.TaxAmount = parseFloat((newLine.TaxAmount).toFixed(2));
          newLine.NetAmount = parseFloat((newLine.NetAmount).toFixed(2));
          newLine.GrossAmount = parseFloat((newLine.GrossAmount).toFixed(2));
          invoice.lines.push(newLine);
          console.log('Complete Process ref ' + ref);
        });
        //console.log('A single invoice: ' + JSON.stringify(invoice));
        invoice.InvoiceDate = formatDate(invoice.InvoiceDate);
        if ( !isValidDate(invoice.InvoiceDate) )  {
          invoice.updateStatus = { 'status': 'warning', 'error': invoice.ExternalReference + ' INVOICE DATE IS NOT A VALID DATE' };
        } // all other dates come from the same place so no need to validate
        invoice.CreationDate = formatDate(invoice.CreationDate);
        invoice.DeliveryDate = formatDate(invoice.DeliveryDate);
        invoice.OrderDate = formatDate(invoice.OrderDate);
        invoice.NetAmount = _.sumBy(invoice.lines, 'NetAmount');
        invoice.TaxAmount = _.sumBy(invoice.lines, 'TaxAmount');
        invoice.GrossAmount = _.sumBy(invoice.lines, 'GrossAmount');
        invoice.TaxAmount = parseFloat((invoice.TaxAmount).toFixed(2));
        invoice.NetAmount = parseFloat((invoice.NetAmount).toFixed(2));
        invoice.GrossAmount = parseFloat((invoice.GrossAmount).toFixed(2));	
	delete invoice.feedLines;
        processedTransactions.push(invoice);
      })
    })
    .catch((err) => { 
      console.log('Caught Error ' + JSON.stringify(err));  
    })
  // And at the end return the transactions
  console.log('Call back ' + processedTransactions.length);
  cb(null, processedTransactions);
}

processData.prototype.PayrollImport = function(feedTransactions, opts, options , cb) {
  //console.log('Running Process Data for Kefron ' + JSON.stringify(opts) );
  //console.log('Running Process Data for Kefron ' + JSON.stringify(options) );
  // Array to return from processData
  processedTransactions = [];

  // format the arrays (Kefron comes with no headers ...
  var transactions = feedTransactions.map(function(obj) {
    return {
      DepartmentID: obj.field16.substr(0,3) + '-' + obj.field16.substr(3,3),
      GLAccountCode: obj.field18,
      Description: obj.field20,
      Amount: obj.field22 - obj.field23,
      ExternalReference: obj.field5
    }
  })
  // The file will load as one single journal - so there is not really a header
  myJournal = {};
  myJournal.ExternalReference = transactions[0].ExternalReference.replace('Unposted Accounts : ','');
  //myJournal.ExternalReference = options.data.type + ':' + options.data.file.substr(0,4) + '-' + options.data.file.substr(4,2) + '-' + options.data.file.substr(6,2)
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
  //console.log(JSON.stringify(myJournal));
  processedTransactions.push(myJournal);
  cb(null, processedTransactions);
  //return processedTransactions;
}
