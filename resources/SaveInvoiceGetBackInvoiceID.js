// fs required for attaching documents
var fs = require('fs');

module.exports = SaveInvoiceGetBackInvoiceID = function(v) {
    return new Promise(function(resolve, reject) {
    console.log('in SaveInvoiceGetBackInvoiceID' + JSON.stringify(v));
    Promise.all([aiq.SaveInvoiceGetBackInvoiceID({invoice: v, create: true})])
      .then((result) => {
        console.log('Resolve SaveInvoiceGetBackInvoiceID' + JSON.stringify(result[0].Status)); 
        if ( result[0].Status == "Created" ) {
          v.transactionID = result[0].invoiceID;
          updateStageStatus = { "stage" : "SaveInvoiceGetBackInvoiceID", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Transaction Saved", "transactionID" : v.transactionID };
          v.updateStageStatus.push(updateStageStatus);
                    console.log('UpdateStageStatuse ' + v.updateStageStatus);
          resolve(v);
        } else {
          updateStageStatus = { "stage" : "SaveInvoiceGetBackInvoiceID", "status": false, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Transaction Save Failed: " + result[0].ErrorCode};
          v.updateStageStatus.push(updateStageStatus);
                    console.log('UpdateStageStatuse ' + v.updateStageStatus);
          reject(v);
        }
      })
      .catch(function(err) { // SOAP error on Save Invoice
        console.log("SOAP Error" + JSON.stringify(err));
        updateStageStatus = { "stage" : "SaveInvoiceGetBackInvoiceID", "status": false, "serverStatus" : v.Status, "message" : "Failed to complete SaveInvoiceGetBackInvoiceID", "error": JSON.stringify(err)};
        v.updateStageStatus.push(updateStageStatus);
                    console.log('UpdateStageStatuse ' + v.updateStageStatus);
        reject(v);
      });
    });
  }
