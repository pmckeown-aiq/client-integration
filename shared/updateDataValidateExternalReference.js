// Helper files to check hard code values on lookup

var Q = require('q');
var soap = require('soap');
var _ = require('lodash');
var path = require('path');
var appDir = path.dirname(require.main.filename);

// For the log file
var bunyan = require('bunyan');
// Set up the logger for app
var appLog = bunyan.createLogger({
  name: 'integration',
  streams: [{
    path: appDir + '/public/logs/integration.log'
  }]
})

var aiqClient = require(appDir + '/helper/aiqClient.js');

module.exports = updateData = function(opts) {
};

updateData.prototype.SaveInvoiceGetBackInvoiceID = function(opts, cb) {
	console.log('My Data in updateData');
	console.log(JSON.stringify(opts.data));
        console.log('Update data for ' + opts.coID)
        console.log('Update data for ' + opts.type)
        console.log('Update data for ' + opts.connection.url)
        console.log('Update data for ' + JSON.stringify(opts.clientSettings.headerValues));
        console.log('Update data transactions ' + JSON.stringify(opts.transactions));
        console.log('Transaction Type: ' + JSON.stringify(opts.processRules.transactionType));
        console.log('Transaction Template: ' + JSON.stringify(opts.processRules.transactionTemplate));
        console.log('Allow negative transactions: ' + JSON.stringify(opts.processRules.negativeTransactionType));
	if ( opts.processRules.negativeTransactionType.allow == true ) {
	// Then we are checking for neagtive values and trying to process 
	  var negativeTransactionCheck = true;
	  var negativeTransactionIdentifier = opts.processRules.negativeTransactionType.identifyBy;
	}
	var isValidCount = 0;
	var isWarnCount = 0;
	var isInValidCount = 0;
	opts.transactions.forEach(function(v) {
          // set (or reset if used a negative value) the transactionType and transactionTemplate to pass to SOAP calls
	  v.transactionType = opts.processRules.transactionType;
	  v.transactionTemplate = opts.processRules.transactionTemplate;
	  console.log(v.ExternalReference);
	  // ok - check if this is a negative transaction type ..
	  if ( negativeTransactionCheck == true ) {
	    console.log('Check for negative transaction: is ' + negativeTransactionIdentifier + ' ' + v[negativeTransactionIdentifier] + ' negative??');
	    if ( v[negativeTransactionIdentifier] < 0 ) {
	      // if the identifier value is a negative numver redefine the transactionType and transactionTemplate to use for this transaction (everything else needs to be the same ...)
	      console.log('We have a negative transaction ' + v.ExternalReference );
	      v.transactionType = opts.processRules.negativeTransactionType.transactionType;
	      v.transactionTemplate = opts.processRules.negativeTransactionType.transactionTemplate;
	      console.log( v[negativeTransactionIdentifier] );
	      // reverse the amount 0 need to support other amounts! 
	      v[negativeTransactionIdentifier] = v[negativeTransactionIdentifier] * -1 
	      console.log( v[negativeTransactionIdentifier]  + ' ' + v.transactionType);
	      console.log( v[negativeTransactionIdentifier]  + ' ' + v.transactionTemplate);
	      // flag for lines 
	      v.negativeAmounts = true;
	    }
	  }
          if ( _.has(v, 'isCorrect') && v.isCorrect.status == false ) {
            process.send({ creatingTransaction: {transactionRef : v.ExternalReference, status : false, message: 'not a valid transaction so not created' }});
	    appLog.info('TransactionToBeRejected: ', v.ExternalReference, 'reason:',  JSON.stringify(v.isCorrect));
	    for ( i=0;i<v.lines.length; i++ ) {
	      appLog.info('TransactionRejected: ', v.ExternalReference, 'LineNo:',  i, 'reason:',  JSON.stringify(v.lines[i].isCorrect));
            }
	    isInValidCount =  isInValidCount + 1;
            //console.log('Transaction ' + v.ExternalReference + ' is not a valid transaction so not created.');
          } else {
            process.send({ creatingTransaction: {transactionRef : v.ExternalReference, status : true, message: 'transaction to be created'  }});
	    appLog.info('TransactionToBeCreated: ', v.ExternalReference )
	    isValidCount =  isValidCount + 1;
	    if ( v.hasOwnProperty('isWarn') ) {
	      appLog.info('TransactionToBeCreatedWithWarnings: ', v.ExternalReference + isWarn);
	      isWarnCount =  isWarnCount + 1;
            }
	      console.log( v[negativeTransactionIdentifier]  + ' ' + v.transactionType);
	      console.log( v[negativeTransactionIdentifier]  + ' ' + v.transactionTemplate);
            soap.createClient(opts.connection.url, (err, client) => {
              var aiq = new aiqClient(client, opts.connection.pKey, opts.connection.uKey, opts.coID);
	      console.log('Check GetInvoicesByExternalReference for v.ExternalReference ' + v.ExternalReference );
              Q.all([aiq.GetInvoicesByExternalReference({externalReference: v.ExternalReference})])
                .then(([r]) => {
	           console.log('GOT GetInvoiceByExternalReference RESULT' + JSON.stringify(r));
		   if (r.Result) {
	             if ( r.Result.Invoice.length > 0 ) {
                       process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : "externalReferenceExists", message:"We have found " + r.Result.Invoice.length + " invoices with ExternalReference " + v.ExternalReference }}); 
	               console.log('We have found ' + r.Result.Invoice.length + ' invoices with ExternalReference ' + v.ExternalReference ); 
		       return ;
		     }
	           console.log('No invoices with ExternalReference ' + v.ExternalReference ); 
		   }
	           console.log( 'ABOUT TO TEMPLATE ' + v[negativeTransactionIdentifier]  + ' ' + v.transactionTemplate);
	           transactionTemplate = v.transactionTemplate;
                   Q.all([aiq[transactionTemplate]({customerCode: v.AccountID })])
                     .then(([r1]) => {
	                console.log('GOT TEMPLATE RESULT' + JSON.stringify(r));
		        // though we only want the result part of the return from GetNewSalesInvoice
	                r1 = r1.Result;
	                // r is now a template - but not a complete template! It is missing a few required fields ... so we add them 
	                r1.OrderNumber = '';
		        r1.PaymentMethodID = '';
		        r1.AreaID = '';
		        //r1.ShipmentViaID = '';
		        r1.Contact = '';
		        r1.Notes = '';
		        r1.DepartmentID = '';
		        // AccountBranchID is a number - not the customer code
		        r1.AccountBranchID = r1.AccountID
		        delete v.AccountID_getFromApiValue;
		        delete v.$$hashKey;
		        // Remove the angular has key from the data we are to send
	                console.log('AFTER TEMPLATE BEFORE MODIFY LINES');
		        for (var i=0;i<v.lines.length;i++) {
	                  delete v.lines[i].$$hashKey;
		          // Remove warnings added to line when amounts calculated
		          // only needed for logging
	                  delete v.lines[i].isWarning;
		          // Validation of line - 
		          // need to set ActualPrice = StockItemPrice * (1 - DiscountRate)
		          //  (v.StockItemPrice * (1 - v.DiscountRate));
		          if ( typeof v.lines[i].TaxAmount == "undefined" ) {
		            console.log('We have no TaxAmount - assume 0');
		            v.lines[i].TaxAmount = 0;
		          }
		          if ( typeof v.lines[i].DiscountRate == "undefined" ) {
		            console.log('We have no DiscountRate - assume 0');
		            v.lines[i].DiscountRate = 0;
		          } 
		          if ( typeof v.lines[i].ActualPrice == "undefined" ) {
		            v.lines[i].ActualPrice = (v.lines[i].StockItemPrice * (1 - v.lines[i].DiscountRate))
		          }
		          // Notes must be chopped to 250 characters (limit in DB)
		          if ( typeof v.lines[i].Notes !== 'undefined' ) {
		            v.lines[i].Notes = v.lines[i].Notes.substring(0,250);
		          }
		          v.lines[i].GrossAmount = v.lines[i].NetAmount +v.lines[i].TaxAmount;
		          console.log('IS ' + v.ExternalReference + ' negative: ' + v.negativeAmounts );
		          if ( v.negativeAmounts == true ) {
		            // make the amounts positive (as they are negative - or should be!) 
		            v.lines[i].StockItemPrice =  v.lines[i].StockItemPrice * -1
		            v.lines[i].NetAmount =  v.lines[i].NetAmount * -1
		            v.lines[i].TaxAmount =  v.lines[i].TaxAmount * -1
		            v.lines[i].GrossAmount =  v.lines[i].GrossAmount * -1
		            v.lines[i].ActualPrice =  v.lines[i].ActualPrice * -1
		          }
	                };
	                console.log('AFTER TEMPLATE AFTER MODIFY LINES');
		        // lines must become lines.invoiceLine(its the way the SOAP API expects it ... also needs to be "Lines"  on "r1"
		        var tempLines = { "InvoiceLine" : v.lines };
		        delete v.lines;
	                v.Lines = tempLines;
		        // Notes must be chopped to 250 characters (limit in DB)
		        if ( typeof v.Notes !== 'undefined' ) {
		          v.Notes = v.Notes.substring(0,250);
		        }
		        //console.log('Final Invoice is ' + JSON.stringify(v));
		        // loop through the transaction object (v) to set the supplied value in the JSON document to the result from GetNewSalesInvoice
	                v.GrossAmount = v.NetAmount + v.TaxAmount;
                        for (var name in v) {
		          // Careful with AccountID - we have that as the account code, but when creating a document we MUST NOT use the account code. The "GetNewSavesInvoice" will have taken our AccountID to get a template - but will have put in an number which corresponds to the account in instead of the account code - so we need to not update that!
		          if ( name != "AccountID" ) {
		            if ( name != "transactionType" ) {
		              if ( name != "transactionTemplate" ) {
		                console.log(name + ' has value ' + v[name]);
		                // and apply to result the corresponding value in feed transactions (referenced as v)
		                r1[name] = v[name];
		              }
		            }
		          }
		        };
		        console.log('AIQ Invoice is transposed to r complete');
	                console.log( 'AFTER TEMPLATE ABOUT TO CREATE ' + v.ExternalReference  + ' ' + v.transactionType);
	                console.log( v.ExternalReference  + ' ' + v.transactionType);
	                transactionType = v.transactionType;
		        console.log('call aiq genericCall for SaveInvoiceGetBackInvoiceID');
		   
	                //Q.all([aiq.SaveInvoiceGetBackInvoiceID({invoice: r, create: true})])
	                Q.all([aiq[transactionType]({invoice: r1, create: true})])
		         .then(([r2]) => {
		           console.log('got back from SaveInvoiceGetBackInvoiceID in updateData for ' + JSON.stringify(r1.ExternalReference) + ' result ' + JSON.stringify(r2));
		           console.log('got back from SaveInvoiceGetBackInvoiceID in updateData for ' + JSON.stringify(r1.ExternalReference) + ' result ' + JSON.stringify(r1));
		           // r2 - the return from the SavInvoiceGetBackInvoiceID
                           // we get r2.Status = "Created" on success
		           // or Unknown - failed. Error is in r2.ErrorCode and r2.ErrorMessage
		           if ( r2.Status == "Created" ) {
                             process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : true, message: 'transaction created: ' + v.transactionType, type: v.transactionType }}); 
		           } else if ( r2.Status == "Unknown" ) {
                             process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : r2.ErrorCode, message: r2.ErrorMessage }}); 
		           } else if ( r2.Status == "Failure" ) {
                             process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : r2.ErrorCode, message: r2.ErrorMessage }}); 
		           }
	                 })
		         .fail(err => {
		           console.log('Error: in updateData SaveInvoiceGetBackInvoiceID:', errors[err])
		           // No r2 comes back 
                           process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : 'SoapError' , message: err }}); 
                           //console.log(err);
                         })
                       })
                   .fail(err => {
                       console.log('Fail Error:', JSON.stringify(err));
                       process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : 'SoapError' , message: err }}); 
                       //console.log(err)
                   })
                   .done();
              })
              .fail(err => {
                 console.log('Fail Error:', JSON.stringify(err));
                 process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : 'SoapError' , message: err }}); 
                 //console.log(err)
              })
              .done();
           })
        }
    })
  appLog.info('ValidTransactions: ', isValidCount );
  appLog.info('InvalidTransactions: ', isInValidCount );
  appLog.info('WarnedTransactions: ',  isWarnCount );
}

