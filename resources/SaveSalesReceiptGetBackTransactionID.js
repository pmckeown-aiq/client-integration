// fs required for attaching documents
var fs = require('fs');

module.exports = SaveSalesReceiptGetBackTransactionID = function(v) {
    return new Promise(function(resolve, reject) {
    console.log('in SaveSalesReceiptGetBackTransactionID' + JSON.stringify(v));
    Promise.all([aiq.SaveSalesReceiptGetBackTransactionID({ 'salesReceipt': v })])
      .then((result) => {
        console.log('Resolve SaveSalesReceiptGetBackTransactionID' + JSON.stringify(result[0])); 
        console.log('Resolve SaveSalesReceiptGetBackTransactionID' + JSON.stringify(v)); 
        if ( result[0].status = "Created" ) {
          // FOR EPIC - Description on the receipt is the External Reference ,....
          v.ExternalReference = v.Description;
          v.transactionID = result[0].transactionID;
          updateStageStatus = { "stage" : "SaveSalesReceiptGetBackTransactionID", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Transaction Saved", "transactionID" : v.transactionID };
          v.updateStageStatus.push(updateStageStatus);
          resolve(v);
        } else {
          updateStageStatus = { "stage" : "SaveSalesReceiptGetBackTransactionID", "status": false, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Transaction Save Failed: " + result[0].ErrorCode};
          v.updateStageStatus.push(updateStageStatus);
          reject(v);
        }
      })
      .catch(function(err) { // SOAP error on Save Invoice
        console.log('SOAP Error' + JSON.stringify(err));
        updateStageStatus = { "stage" : "SaveSalesReceiptGetBackTransactionID", "status": false, "serverStatus" : v.Status, "message" : "Failed to complete SaveSalesReceiptGetBackTransactionID", "error": JSON.stringify(err)};
        v.updateStageStatus.push(updateStageStatus);
        reject(v);
      });
    });
  }
