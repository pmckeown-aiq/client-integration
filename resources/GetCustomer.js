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

module.exports = GetCustomer = function(v) {
    // GetCustomer - based on a invoice with CustomerCode - get AccountID
    return new Promise(function(resolve, reject) {
    Promise.all([aiq.GetCustomer({ customerCode: v.CustomerCode })])
      .then((result) => {
        if ( result[0].Status == "Success" ) {
          if (result[0].Result) {
            if (result[0].Result.AccountID) {
              // fetch out the transaction ID's
              v.AccountID = result[0].Result.AccountID ;
              updateStageStatus = { "stage" : "GetCustomer", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Fetched AccountID for Customer Code " + v.CustomerCode};
              v.updateStageStatus.push(updateStageStatus);
              resolve(v);
            }
          } else {
            updateStageStatus = { "stage" : "GetCustomer", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Customer Code Not Found : " + v.CustomerCode };
            v.updateStageStatus.push(updateStageStatus);
            reject(v);
          }
        } else {
          updateStageStatus = { "stage" : "GetCustomer", "status": false, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Get Supplier Failed: " + result[0].ErrorCode};
          v.updateStageStatus.push(updateStageStatus);
          reject(v);
        }
      })
      .catch(function(err) { // SOAP error on Save Invoice
        //console.log('SOAP Error' + JSON.stringify(err));
        updateStageStatus = { "stage" : "GetCustomer", "status": false, "serverStatus" : v.Status, "message" : "Failed to complete GetCustomer", "error": JSON.stringify(err)};
        v.updateStageStatus.push(updateStageStatus);
        reject(v);
      });
    });
  }
