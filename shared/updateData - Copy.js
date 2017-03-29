var Q = require('q');
var soap = require('soap');
var _ = require('lodash');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var async = require('async');

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
  var envConnectionDetails = [];
  // push the "normal" or primary environment into the coID array 
  envConnectionDetails.push({ "coID": opts.coID, "value": "default", "uKey": opts.connection.uKey, "pKey": opts.connection.pKey, "url": opts.connection.url});
  // Multiple Environments ... if we have additionalEnv - add the details (change of coID and uKey plus a new value) into the array ...
  if ( typeof opts.additionalEnvs !== 'undefined' ) {
    console.log('We Have Multiple Environments in SaveInvoiceGetBackInvoiceID');
    // additional environments are stored in an array
    opts.additionalEnvs.forEach(function(additionalEnv) {
      // push the additional environment into the coID array
      // and the value of the field that identifies the coID is 
      envConnectionDetails.push({ "coID": additionalEnv.coID, "value": additionalEnv.identifiedBy.value, "uKey": additionalEnv.uKey, "pKey": opts.connection.pKey, "url": opts.connection.url });
    })
  }
  console.log('in SaveInvoiceGetBackInvoiceID' + JSON.stringify(envConnectionDetails));
  console.log('My Data in updateData');
  if ( opts.processRules.negativeTransactionType.allow == true ) {
  // Then we are checking for neagtive values and trying to process 
    var negativeTransactionCheck = true;
    var negativeTransactionIdentifier = opts.processRules.negativeTransactionType.identifyBy;
  }
  if ( typeof opts.writeBackRules.allowed != 'undefined' ) {
    var writeBack = require(appDir + opts.writeBackRules.script);
  }
  var isValidCount = 0;
  var isWarnCount = 0;
  var isInValidCount = 0;
  // Number of transactions to process at any one time 
  if ( typeof opts.processRules.asyncLimit === 'undefined' ) {
    var asyncLimit = 10;
  } else {
    var asyncLimit = opts.processRules.asyncLimit
  }
  console.log('asyncLimit is ' + asyncLimit);
  //opts.transactions.forEach(function(v) {
  async.forEachLimit(opts.transactions,asyncLimit, function(v,  next) {
    // counter to check the transactions complete
    // set (or reset if used a negative value) the transactionType and transactionTemplate to pass to SOAP calls
    console.log('UPDATA DATA INVOICE IS ' + JSON.stringify(v));
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
      process.send({ creatingTransaction: {transactionRef : v.ExternalReference, status : false, message: 'not a valid transaction so not created ' + v.isCorrect.error }});
      appLog.info('TransactionToBeRejected: ', v.ExternalReference, 'reason:',  JSON.stringify(v.isCorrect));
      for ( i=0;i<v.lines.length; i++ ) {
        appLog.info('TransactionRejected: ', v.ExternalReference, 'LineNo:',  i, 'reason:',  JSON.stringify(v.lines[i].isCorrect));
      }
      isInValidCount =  isInValidCount + 1;
      // Call the callback for the async.forEachLimit
      next();
      //console.log('Transaction ' + v.ExternalReference + ' is not a valid transaction so not created.');
    } else {
      // VALID TRANSACTIONS - do the data update
      process.send({ creatingTransaction: {transactionRef : v.ExternalReference, status : true, message: 'transaction to be created'  }});
      appLog.info('TransactionToBeCreated: ', v.ExternalReference )
      isValidCount =  isValidCount + 1;
      if ( v.hasOwnProperty('isWarn') ) {
        appLog.info('TransactionToBeCreatedWithWarnings: ', v.ExternalReference + isWarn);
        isWarnCount =  isWarnCount + 1;
      }
      console.log( v[negativeTransactionIdentifier]  + ' ' + v.transactionType);
      console.log( v[negativeTransactionIdentifier]  + ' ' + v.transactionTemplate);
      console.log(JSON.stringify(opts.connection));
      // before we connect - set the connection details for this transaction ...
      if ( typeof opts.additionalEnvs !== 'undefined' ) {
        // check for the object in the transactiona array that defines which coID this transaction belongs to
        coIDIdentifier = opts.additionalEnvs[0].identifiedBy.name;
        console.log('SaveInvoiceGetBackInvoiceID Look for ' + JSON.stringify(coIDIdentifier));
        console.log('in SaveInvoiceGetBackInvoiceID ' + JSON.stringify(v));
	myEnvironmentIdentifierValue = v[coIDIdentifier];
	this.myConnectionDetails = _.filter(envConnectionDetails, { value: myEnvironmentIdentifierValue });
	console.log('myConnectionDetails has length SaveInvoiceGetBackInvoiceID ' + this.myConnectionDetails.length)
        // We should only have one match ...
	if ( this.myConnectionDetails.length === 1 ) {
	  this.myConnection = this.myConnectionDetails[0];
        } else if ( this.myConnectionDetails.length === 0 ) {
	  // if no match default to the default coID
	  console.log('Not Multi Database');
          this.myConnection = envConnectionDetails[0];
	} else {
	  // if we got more than 1 then trouble
          err = 'Error in updateData.js - we got more than 1 connection detail identified for transaction ' + JSON.stringify(v);
	  return(err);
        }
      } else {
        // the coIDs array will only have one coID - and that will be used for all objects
	console.log('Not Multi Database');
        this.myConnection = envConnectionDetails[0];
      }
      console.log('myConnection is SaveInvoiceGetBackInvoiceID ' + JSON.stringify(this.myConnection));
      soap.createClient(this.myConnection.url, (err, client) => {
	this.aiq = new aiqClient(client, this.myConnection.pKey, this.myConnection.uKey, this.myConnection.coID);
        //var aiq = new aiqClient(client, opts.connection.pKey, opts.connection.uKey, opts.coID);
        console.log( 'ABOUT TO TEMPLATE ' + v[negativeTransactionIdentifier]  + ' ' + v.transactionTemplate + ' companyIDforConnection ' +  this.myConnection.coID);
        transactionTemplate = v.transactionTemplate;
        if ( v.transactionTemplate == 'GetNewPurchasesInvoice' ) {
          templatingType = 'supplierCode';
          accountID = 'PurchaseAccountID'; // had to change the AccountID for purchasing to differentiat with sales AccountID
        } else {
          templatingType = 'customerCode';
          accountID = 'AccountID'; // had to change the AccountID for purchasing to differentiat with sales AccountID
        }
	console.log([templatingType] + JSON.stringify(v[accountID]));
        Q.all([this.aiq[transactionTemplate]({[templatingType]: v[accountID] })])
          .then(([r1]) => {
            console.log(JSON.stringify(r1));
            // though we only want the result part of the return from GetNewSalesInvoice
            r1 = r1.Result;
            // r is now a template - but not a complete template! It is missing a few required fields ... so we add them 
            r1.OrderNumber = '';
            r1.PaymentMethodID = '';
            r1.AreaID = '';
            //r.ShipmentViaID = '';
            r1.Contact = '';
            r1.Notes = '';
            r1.DepartmentID = '';
            // AccountBranchID is a number - not the customer code
            r1.AccountBranchID = r1.AccountID
            delete v.AccountID_getFromApiValue;
            delete v.$$hashKey;
            // Remove the angular has key from the data we are to send
            for (var i=0;i<v.lines.length;i++) {
              delete v.lines[i].$$hashKey;
              // Remove warnings added to line when amounts calculated
              // only needed for logging
              delete v.lines[i].isWarning;
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
              v.lines[i].GrossAmount = (v.lines[i].NetAmount*1) + (v.lines[i].TaxAmount*1);
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
            console.log('Lines are ' + JSON.stringify(v.lines));
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
            // May not have header amoungt fields ... can supply as 0 and leave AIQ to work out
            if ( typeof v.NetAmount == "undefined" ) {
              v.NetAmount = 0;
            }
            if ( typeof v.TaxAmount == "undefined" ) {
              v.TaxAmount = 0;
            }
            v.GrossAmount = (v.NetAmount*1) + (v.TaxAmount*1);
            // Transpose v into r1 (update the SOAP invoice
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
            console.log('call aiq genericCall for SaveInvoiceGetBackInvoiceID' +  ' companyIDforConnection ' + this.myConnection.coID);
            Q.all([this.aiq[transactionType]({invoice: r1, create: true})])
              .then(([r2]) => {
                console.log('got back from SaveInvoiceGetBackInvoiceID in updateData for ' + JSON.stringify(r1.ExternalReference) + ' result ' + JSON.stringify(r2));
                // r2 - the return from the SavInvoiceGetBackInvoiceID
                // we get r2.Status = "Created" on success
                // or Unknown - failed. Error is in r2.ErrorCode and r2.ErrorMessage
		// Write back the update to the api if needed ...

                if ( r2.Status == "Created" ) {
                  console.log('updateData got ' + r2.Status);
 	          console.log('CHECK IF NEED TO POST ' + v.Status );
                  if ( v.Status == 'Posted' ) { // the invoice should be posted - cant do when save it, need to post it using the invoiceID
                    console.log('GOING TO POST ' +  r2.invoiceID );
     	            Q.all([this.aiq['PostInvoiceGetBackTransactionID']({invoiceID: r2.invoiceID})])
          	     .then(([r3]) => {
          	       console.log('got back from PostInvoiceGetBackTransactionID in updateData for ' + JSON.stringify(r1.ExternalReference) + ' result ' + JSON.stringify(r3));
          	     })
                     .fail(err => {
                       console.log('Error: in updateData PostInvoiceGetBackTransactionID:', errors[err.error])
                       console.log(err);
                     })
                  } 
                  process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : true, message: 'transaction created'  }}); 
		  console.log('writeBack?')
	          if ( opts.writeBackRules) {
	            if ( opts.writeBackRules.allowed == true ) {
		      console.log('calling writeBack function ' + opts.writeBackRules.writeBackFunction)
	              this.writeBack = new writeBack(this);
	              try {
		        this.writeBack[opts.writeBackRules.writeBackFunction](opts, v, function(err, wroteBack) {
			  if (err) { 
			    console.log('Error returned ' + JSON.stringify(err))
                            process.send({ "error" : "error writing back data " , "data": err }); 
			    return err;
			  };
                          process.send({ wroteBack }); 
	                })
		      } catch (err) {
			  console.log('catch called ' + err);
                          process.send({ "error" : "error writing back data " + err }); 
		      }
		      wroteBack.transactionRef = v.ExternalReference;
	              console.log('WroteBack Result: ' + JSON.stringify(wroeBack));
                      process.send({ wroteBack }); 
	            }
	          }
                } else if ( r2.Status == "Unknown" ) {
                  process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : r2.ErrorCode, message: r2.ErrorMessage }}); 
                } else if ( r2.Status == "Failure" ) {
                  process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : r2.ErrorCode, message: r2.ErrorMessage }}); 
                }
              })
              .fail(err => {
                console.log('Error: in updateData SaveInvoiceGetBackInvoiceID:', errors[err.error])
                // No r2 comes back 
                process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : 'SoapError' , message: err }}); 
                console.log(err);
              })
            // end of the Q.all create transaction (no closing character)
          })
          .fail(err => {
            console.log('Error:', JSON.stringify(err));
            process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : 'SoapError' , message: err }}); 
            console.log(err)
          })
          .done(function() {
            console.log('COMPLETED UPDATE' + JSON.stringify(v));
	    next();
	  });
        // end of the Q.all transaction template (no closing character)
      }) // end SOAP.createClient 
    } // end the if/else VALID TRANSACTION else statement
  }, function(err) {
    if (err) return next(err);
  }) // end opts.transactions forEach
  appLog.info('ValidTransactions: ', isValidCount );
  appLog.info('InvalidTransactions: ', isInValidCount );
  appLog.info('WarnedTransactions: ',  isWarnCount );
  cb('update complete');
}

// CreateGeneralJournal - it is very simple, has no "templating" to create a shell - so must come fully constructed (not that much to it!) 
updateData.prototype.CreateGeneralJournal = function(opts, cb) {
  var isValidCount = 0;
  var isWarnCount = 0;
  var isInValidCount = 0;
  // Number of transactions to process at any one time 
  if ( typeof opts.processRules.asyncLimit === 'undefined' ) {
    var asyncLimit = 10;
  } else {
    var asyncLimit = opts.processRules.asyncLimit
  }
  console.log('asyncLimit is ' + asyncLimit);
  //opts.transactions.forEach(function(v) {
  async.forEachLimit(opts.transactions,asyncLimit, function(v,  next) {
    // counter to check the transactions complete
    // set (or reset if used a negative value) the transactionType and transactionTemplate to pass to SOAP calls
    console.log('UPDATA DATA ' + JSON.stringify(v));
    transactionType = opts.processRules.transactionType;
    console.log(v.ExternalReference);
    if ( _.has(v, 'isCorrect') && v.isCorrect.status == false ) {
      process.send({ creatingTransaction: {transactionRef : v.ExternalReference, status : false, message: 'not a valid transaction so not created ' + v.isCorrect.error }});
      appLog.info('TransactionToBeRejected: ', v.ExternalReference, 'reason:',  JSON.stringify(v.isCorrect));
      for ( i=0;i<v.lines.length; i++ ) {
        appLog.info('TransactionRejected: ', v.ExternalReference, 'LineNo:',  i, 'reason:',  JSON.stringify(v.lines[i].isCorrect));
      }
      isInValidCount =  isInValidCount + 1;
      // Call the callback for the async.forEachLimit
      next();
      //console.log('Transaction ' + v.ExternalReference + ' is not a valid transaction so not created.');
    } else {
      // VALID TRANSACTIONS - do the data update
      process.send({ creatingTransaction: {transactionRef : v.ExternalReference, status : true, message: 'transaction to be created'  }});
      appLog.info('TransactionToBeCreated: ', v.ExternalReference )
      isValidCount =  isValidCount + 1;
      if ( v.hasOwnProperty('isWarn') ) {
        appLog.info('TransactionToBeCreatedWithWarnings: ', v.ExternalReference + isWarn);
        isWarnCount =  isWarnCount + 1;
      }
      // First we need to take the "lines" in array "lines" and push then into a "GeneralJournalLine", which then need to be pushed into a "Lines" array!
      v.Lines = [];
      v.lines.forEach(function(GeneralJournalLine) {
	myLine = {}
        myLine.GeneralJournalLine = GeneralJournalLine;
        v.Lines.push(myLine);
      })
      delete v.lines;
      console.log(JSON.stringify(v));
      delete v.$$hashKey;
      soap.createClient(opts.connection.url, (err, client) => {
        this.aiq = new aiqClient(client, opts.connection.pKey, opts.connection.uKey, opts.coID);
          Q.all([this.aiq[transactionType]({ journal: v })])
            .then(([r2]) => {
              console.log('got back from CreateGeneralJournal in updateData for ' + JSON.stringify(v.ExternalReference) + ' result ' + JSON.stringify(r2));
              if ( r2.Status == "Success" ) {
                console.log('updateData got ' + r2.Status);
                process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : true, message: 'transaction created'  }}); 
              } else if ( r2.Status == "Unknown" ) {
                process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : r2.ErrorCode, message: r2.ErrorMessage }}); 
              } else if ( r2.Status == "Failure" ) {
                process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : r2.ErrorCode, message: r2.ErrorMessage }}); 
              }
            })
            .fail(err => {
              console.log('Error: in updateData CreateGeneralJournal :', errors[err.error])
              // No r2 comes back 
              process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : 'SoapError' , message: err }}); 
              console.log(err);
            })
            // end of the Q.all create transaction (no closing character)
      }) // end SOAP.createClient 
    } // end the if/else VALID TRANSACTION else statement
  }, function(err) {
    if (err) return next(err);
  }) // end opts.transactions forEach
  appLog.info('ValidTransactions: ', isValidCount );
  appLog.info('InvalidTransactions: ', isInValidCount );
  appLog.info('WarnedTransactions: ',  isWarnCount );
  cb('update complete');
}

// Sales Batch Invoices - without validation of ExternalReference
updateData.prototype.CreateBatchSalesInvoiceGetBackTransactionID = function(opts, cb) {
        // To support validating data against multiple environments use a envConnectionDetails array
        // may just have one connection, but may have more than one. The coID and the uKey will vary for each database (but assuming url and pKey will be the same .. for neatness stuff all of them into the array 
        var envConnectionDetails = [];
        // push the "normal" or primary environment into the coID array 
        envConnectionDetails.push({ "coID": opts.coID, "value": "default", "uKey": opts.connection.uKey, "pKey": opts.connection.pKey, "url": opts.connection.url});

        // Multiple Environments ... if we have additionalEnv - add the details (change of coID and uKey plus a new value) into the array ...
        if ( typeof opts.additionalEnvs !== 'undefined' ) {
          console.log('We Have Multiple Environments');
          // additional environments are stored in an array
          opts.additionalEnvs.forEach(function(additionalEnv) {
            // push the additional environment into the coID array
            // and the value of the field that identifies the coID is 
            envConnectionDetails.push({ "coID": additionalEnv.coID, "value": additionalEnv.identifiedBy.value, "uKey": additionalEnv.uKey, "pKey": opts.connection.pKey, "url": opts.connection.url });
          })
        }
        console.log('envConnectionDetails array is ' + JSON.stringify(envConnectionDetails));
        console.log('Update data for ' + opts.type)
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
	  console.log('UPDATA DATA INVOICE IS ' + JSON.stringify(v));
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
            // before we connect - set the connection details for this transaction ...
            if ( typeof opts.additionalEnvs !== 'undefined' ) {
              // check for the object in the transactiona array that defines which coID this transaction belongs to
              coIDIdentifier = opts.additionalEnvs[0].identifiedBy.name;
              console.log('Look for ' + JSON.stringify(coIDIdentifier));
              console.log('in ' + JSON.stringify(v));
	      myEnvironmentIdentifierValue = v[coIDIdentifier];
	      this.myConnectionDetails = _.filter(envConnectionDetails, { value: myEnvironmentIdentifierValue });
	      console.log('myConnectionDetails has length ' + this.myConnectionDetails.length)
              // We should only have one match ...
	      if ( this.myConnectionDetails.length === 1 ) {
	        this.myConnection = this.myConnectionDetails[0];
              } else if ( this.myConnectionDetails.length === 0 ) {
	        // if no match default to the default coID
	        console.log('Not Multi Database');
                this.myConnection = envConnectionDetails[0];
	      } else {
	      // if we got more than 1 then trouble
                err = 'Error in updateData.js - we got more than 1 connection detail identified for transaction ' + JSON.stringify(v);
	        return(err);
              }
            } else {
	      // the coIDs array will only have one coID - and that will be used for all objects
	      console.log('Not Multi Database');
              this.myConnection = envConnectionDetails[0];
            }
	    console.log('myConnection is ' + JSON.stringify(this.myConnection));
            soap.createClient(this.myConnection.url, (err, client) => {
              this.aiq = new aiqClient(client, this.myConnection.pKey, this.myConnection.uKey, this.myConnection.coID);
	      console.log( 'ABOUT TO TEMPLATE ' + v[negativeTransactionIdentifier]  + ' ' + v.transactionTemplate);
	      transactionTemplate = v.transactionTemplate;
              Q.all([this.aiq[transactionTemplate]({customerCode: v.CustomerCode })])
                .then(([r1]) => {
	          // though we only want the result part of the return from GetNewSalesInvoice
	           r1 = r1.Result;
	           console.log('RAW R1 is ' + JSON.stringify(r1));
	           // r is now a template - but not a complete template! It is missing a few required fields ... so we add them 
	           delete v.AccountID_getFromApiValue;
	           delete v.$$hashKey;
                   // Remove the angular has key from the data we are to send
	           for (var i=0;i<v.lines.length;i++) {
	             delete v.lines[i].$$hashKey;
	             // Remove warnings added to line when amounts calculated
                     // only needed for logging
	             delete v.lines[i].isWarning;
	             // Validation of line - 
                     if ( v.negativeAmounts == true ) {
		       // make the amounts positive (as they are negative - or should be!) 
		       v.lines[i].NetAmount =  v.lines[i].NetAmount * -1
		     }
	           };
	           console.log('Lines are ' + JSON.stringify(v.lines));
	           // lines must become lines.invoiceLine(its the way the SOAP API expects it ... also needs to be "Lines"  on "r1"
	           var tempLines = { "BatchSalesInvoiceLine" : v.lines };
                   delete v.lines;
	           v.Lines = tempLines;
		   // Transpose v into r1 (update the SOAP invoice
                   for (var name in v) {
		     // Careful with AccountID - we have that as the account code, but when creating a document we MUST NOT use the account code. The "GetNewSavesInvoice" will have taken our AccountID to get a template - but will have put in an number which corresponds to the account in instead of the account code - so we need to not update that!
		     if ( name != "AccountID" ) {
		       if ( name != "transactionType" ) {
		         if ( name != "transactionTemplate" ) {
		           if ( name != "EnvironmentIdentifier" ) {
		             if ( name != "CustomerCode" ) {
		               console.log(name + ' has value ' + v[name]);
		               // and apply to result the corresponding value in feed transactions (referenced as v)
		               r1[name] = v[name];
		             }
		           }
		         }
		       }
		     }
		   };
		   console.log('AIQ Invoice is transposed to r1 complete' + JSON.stringify(r1));
		   console.log('AIQ Invoice is ' + JSON.stringify(v));
	           console.log( 'AFTER TEMPLATE ABOUT TO CREATE ' + v.ExternalReference  + ' ' + v.transactionType);
	           console.log( v.ExternalReference  + ' ' + v.transactionType);
	           transactionType = v.transactionType;
		   console.log('call aiq genericCall for SaveInvoiceGetBackInvoiceID');
		  
		   // CreateBatch requires "inv" to wrap the object (Item invoices need "invoice"
	           Q.all([this.aiq[transactionType]({inv: r1, create: true})])
		    .then(([r2]) => {
		      console.log('got back from SaveInvoiceGetBackInvoiceID in updateData for ' + JSON.stringify(r1.ExternalReference) + ' result ' + JSON.stringify(r2));
		      // r2 - the return from the SavInvoiceGetBackInvoiceID
                      // we get r2.Status = "Created" on success
		      // or Unknown - failed. Error is in r2.ErrorCode and r2.ErrorMessage
		      if ( r2.Status == "Created" ||  r2.Status == "Success" ) {
			console.log('updateData got ' + r2.Status + '...');
                        process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : true, message: 'transaction created', transactionId: r2.invoiceID  }}); 
		      } else if ( r2.Status == "Unknown" ) {
                        process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : r2.ErrorCode, message: r2.ErrorMessage }}); 
		      } else if ( r2.Status == "Failure" ) {
                        process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : r2.ErrorCode, message: r2.ErrorMessage }}); 
		      }
	            })
		    .fail(err => {
		      console.log('Error: in updateData SaveInvoiceGetBackInvoiceID:', errors[err.error])
		      // No r2 comes back 
                      process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : 'SoapError' , message: err }}); 
                      console.log(err);
                    })
                  })
              .fail(err => {
                  console.log('Error:', JSON.stringify(err));
                  process.send({ createdTransaction: {transactionRef : v.ExternalReference, status : false, errorCode : 'SoapError' , message: err }}); 
                  console.log(err)
              })
              .done();
          })
        }
    })
  appLog.info('ValidTransactions: ', isValidCount );
  appLog.info('InvalidTransactions: ', isInValidCount );
  appLog.info('WarnedTransactions: ',  isWarnCount );
  cb('update complete');
}
