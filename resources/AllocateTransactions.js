// fs required for attaching documents
var fs = require('fs-extra');

// fs required for attaching documents
// function to encode file data to base64 encoded string
function base64_encode(file) {
    // read binary data
    var attachment = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(attachment).toString('base64');
}

// required for GetTransactionsByExternalReference
var _ = require('lodash');

// AllocateTransactions expects two items to be passed to it - v (a payment or receipt) and i - an array of invoices 
// but promises only return/accept 1 argument so as v: { "fetchedVia": v, "fetchedInvoices": [invoiceArray]}
module.exports = AllocateTransactions = function(v) {
    return new Promise(function(resolve, reject) {
      var invoices = v.fetchedTransactions;
      var payment = v.fetchedVia;
      console.log('in AllocateTransactions invoices' + JSON.stringify(invoices));
      console.log('in AllocateTransactions payment' + JSON.stringify(payment));
      if ( invoices.length > 0 ) { // have invoices and length of invoices is greater than 0 - we have invoices
        if ( invoices.length == 1 ) { // have invoices and length of invoices is greater than 0 - we have invoices
          myAllocation = {};
          myAllocation.transactionID_1 =  invoices[0].TransactionID;
          myAllocation.transactionID_2 =  payment.transactionID;
          myAllocation.allocationReference = payment.ExternalReference;
          myAllocation.allocationAmount = payment.PaymentAmount;
          myAllocation.allocationDate = payment.PaymentDate;
          console.log('GOING TO ALLOCATE ' + JSON.stringify(myAllocation))
          Promise.all([aiq.AllocateTransactions(myAllocation)])
            .then((result) => {
              console.log('Check Result AllocateTransactionsResult ' + JSON.stringify(result[0]));
              if (result[0] ) {
                if (result[0].Status == 'Success' ) {
                    updateStageStatus = { "stage" : "AllocateTransactions", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Allocation Complete" };
                    payment.updateStageStatus.push(updateStageStatus);
                    resolve(payment);
                } else {
                  updateStageStatus = { "stage" : "AllocateTransactions", "status": false, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Allocation Failed: " + result[0].ErrorCode};
                  payment.updateStageStatus.push(updateStageStatus);
                  reject(payment);
                } 
              }
            })
            .catch(function(err) { // SOAP error on allocation
              console.log('SOAP Error' + JSON.stringify(err));
              updateStageStatus = { "stage" : "AllocateTransactions", "status": false, "serverStatus" : payment.Status, "message" : "Failed to complete AllocateTransactions", "error": JSON.stringify(err)};
              payment.updateStageStatus.push(updateStageStatus);
              reject(payment);
            });
        } else {
          // Not sure yet what to do when more than one invoice
          updateStageStatus = { "stage" : "AllocateTransactions", "status": false, "serverStatus" : "MultipleInvoices", "error" : "", "message" : "Allocation had more than 1 invoice to allocate " + payment.ExternalReference + " to. Not yet supported."};
          payment.updateStageStatus.push(updateStageStatus);
          reject(payment);
        } 
      } else { // i was not there or had a length of 0 - no invoices
      // Just send it back ... not an error just nothing to do ...
        updateStageStatus = { "stage" : "AllocateTransactions", "status": false, "serverStatus" : "NoInvoices", "error" : "", "message" : "Allocation had no invoices to allocate " + payment.ExternalReference + " to."};
        payment.updateStageStatus.push(updateStageStatus);
        reject(payment);
      }
    });
  }
