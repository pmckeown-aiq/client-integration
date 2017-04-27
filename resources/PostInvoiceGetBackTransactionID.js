// fs required for attaching documents
var fs = require('fs');

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

module.exports = PostInvoiceGetBackTransactionID = function(v) {
    return new Promise(function(resolve, reject) {
    console.log('in postInvoice' + JSON.stringify(v));
    console.log('CHECK IF NEED TO POST ' + v.updateStageStatus.status + ' ' + v.Status);
    //if ( v.updateStageStatus.status == 'Created' && v.Status == 'Posted' ) { // the invoice should be posted - cant do when save it, need to post it using the transactionID
    if ( v.Status == 'Posted' ) { // the invoice should be posted - cant do when save it, need to post it using the transactionID
    console.log('GOING TO POST ' +  v.updateStageStatus.transactionID );
      Promise.all([aiq.PostInvoiceGetBackTransactionID({ invoiceID: v.transactionID })])
        .then((result) => {
          updateStageStatus = { "stage" : "PostInvoiceGetBackTransactionID", "status": false, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Transaction Posted", "transactionID": v.transactionID  };
          v.updateStageStatus.push(updateStageStatus);
          if ( result[0].status = "Created" ) {
            console.log('Resolve PostInvoiceGetBackTransactionID' + JSON.stringify(v.updateStageStatus)); 
            resolve(v);
          } else {
            reject(v);
          }
          resolve(v);
        }).catch(function(err) { // SOAP error on Post Invoice
          console.log('SOAP Error' + JSON.stringify(result));
          updateStageStatus = { "stage" : "PostInvoiceGetBackTransactionID", "status": false, "serverStatus" : v.Status, "message" : "Failed.", "error": JSON.stringify(err), "transactionID": v.transactionID  };
          v.updateStageStatus.push(updateStageStatus);
          reject(v);
      });
    } else {
          console.log('Resolve postInvoice - No Need to Post Invoice');
          resolve(v);
    }
    })
    .catch(function(err) { // SOAP error on Post Invoice
      console.log('SOAP Error' + JSON.stringify(err));
      updateStageStatus = { "stage" : "postInvoice", "status": true, "serverStatus" : v.Status, "message" : "Failed.", "error": JSON.stringify(err), "transactionID": v.transactionID  };
      v.updateStageStatus.push(updateStageStatus);
      console.log(JSON.stringify(v.updateStageStatus));
      resolve(v);
    });
  }
