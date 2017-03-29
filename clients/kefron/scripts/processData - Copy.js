var path = require('path');
var appDir = path.dirname(require.main.filename);
console.log('App Dir is ' + appDir);
var _ = require('lodash');
var clone = require('clone');
var fs = require("fs");
// required to evaluate properties in the conf file (dynamically setting variables)
var safeEval = require('safe-eval')
module.exports = processData = function (feedTransactions, opts) {
};

processData.prototype.SaveInvoiceGetBackInvoiceID = function(feedTransactions, opts ) {
    console.log('Running Process Data for Kefron ' + JSON.stringify(opts) );
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

    feedTransactions.forEach(function(entry) {
      //console.log(entry)
    })
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
        AccountID: obj.field3,
	// this invoice number may be the ExternalReference (or may not be - as we bunch up by customer to create a single invoice
        ExternalReference: obj.field4,
        Description: obj.field2 + ";" + obj.field5 + ";" + obj.field6 + ";",
        InvoiceDate: obj.field7,
        VatCheckHeader: obj.field17
      }
    })

    var invoiceLines = unnamedLines.map(function(obj) {
      return {
        ExternalReference: obj.field2,
	// this invoice number may be the ExternalReference (or may not be - as we bunch up by customer to create a single invoice
        GLAccountCode: obj.field4,
        Notes: obj.field9 + ";" + obj.field13 + ";",
        DepartmentID: obj.field12 + "-" + obj.field11 ,
        TaxCode: obj.field14,
        StockItemPrice: obj.field15,
        InvoicedQuantity: obj.field16,
        NetAmount: obj.field15 * obj.field16,
	StockItemID: "SRV"
      }
    })
    console.log('A header' + JSON.stringify(invoiceHeaders[0]));
    console.log('A Line' + JSON.stringify(invoiceLines[0]));
    // Invoices are actually one per customer ... so need to grab the customers
    // Customers are field4 on TH lines
    customersList = _.map(invoiceHeaders, 'AccountID');
    customers = _.uniq(customersList)
    
    console.log(JSON.stringify(customers));
    // Loop through customers ..
    customers.forEach(function(customer) {
      // Now go and grab the headers for the customer
      myCustomerHeaders = _.filter(invoiceHeaders, { AccountID: customer });
      console.log(customer + ' has ' + myCustomerHeaders.length + ' invoice headers');
      // If the customer has only one header then the ExternalReference is the RSS invoice reference (stored in Inv_Or_GL column when the line is a TH - or in invoiceHeaders
      if ( myCustomerHeaders.length === 1 ) {
	//console.log(JSON.stringify(myCustomerHeaders));
	invoice = {};
        invoice= myCustomerHeaders[0];
        console.log(invoice.AccountID + ' has 1 invoice only so ExternalReference is ' + invoice.ExternalReference);
	// Now filter out the lines for this reference number
        myLines = _.filter(invoiceLines, { ExternalReference : invoice.ExternalReference });
	// Array to hold invoice lines
	invoice.lines = [];
	myLines.forEach(function(l) {
          invoice.lines.push(l); 
	});
	console.log('A single invoice: ' + JSON.stringify(invoice));
      } else {
        // If the customer has more than one line the ExternalReference is the customer code ...
	invoice = {};
        invoice.ExternalReference = customer;
        invoice.AccountID = customer;
	// the headers become pretty irrelevant - but we need them to identify the lines to match ..
        allHeaders = _.map(myCustomerHeaders, 'ExternalReference');
	console.log('First Header ' + JSON.stringify(allHeaders[0]));
        invoice.InvoiceDate = allHeaders[0].InvoiceDate;
        headers = _.uniq(allHeaders);
        // array for the lines 	
	invoice.lines = [];
	myLines = [];
	headers.forEach(function(h) {
	  console.log('Checking for lines matching invoice ' + h );
          anInvoiceLines = _.filter(invoiceLines, { ExternalReference : h });
	  myLines.push(anInvoiceLines);
	});
	// then turn these into invoice lines
	myLines.forEach(function(l) {
	  l.forEach(function(m) {
	    console.log('Multi Line Type ' + JSON.stringify(m));
            invoice.lines.push(m); 
	  })
	});
	console.log('Multi Line Type ' + JSON.stringify(invoice));
	//console.log(JSON.stringify(invoice));
      }
      processedTransactions.push(invoice);
    });
    //console.log(JSON.stringify(processedTransactions));
    // And at the end return the transactions
    console.log(JSON.stringify(processedTransactions));
    return processedTransactions;
  }
