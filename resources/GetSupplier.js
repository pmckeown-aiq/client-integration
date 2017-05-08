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

module.exports = GetSupplier = function(v) {
    // GetSupplier - based on a invoice with SupplierCode - get AccountID
    return new Promise(function(resolve, reject) {
    console.log('in GetSupplier' + JSON.stringify(v));
    Promise.all([aiq.GetSupplier({ supplierCode: v.SupplierCode })])
      .then((result) => {
        console.log('Resolve GetSupplier' + JSON.stringify(result[0])); 
        if ( result[0].Status == "Success" ) {
          if (result[0].Result) {
            console.log('Check Result - ' + JSON.stringify(result[0].Result));
            if (result[0].Result.AccountID) {
              console.log('GetSupplier returned:' + JSON.stringify(result[0].Result.AccountID));
              // fetch out the transaction ID's
              v.AccountID = result[0].Result.AccountID ;
              updateStageStatus = { "stage" : "GetSupplier", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Fetched AccountID for Supplier Code " + v.SupplierCode};
              v.updateStageStatus.push(updateStageStatus);
              resolve(v);
            }
          } else {
            updateStageStatus = { "stage" : "GetSupplier", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Supplier Code Not Found : " + v.SupplierCode};
            v.updateStageStatus.push(updateStageStatus);
            reject(v);
          }
        } else {
          updateStageStatus = { "stage" : "GetSupplier", "status": false, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Get Supplier Failed: " + result[0].ErrorCode};
          v.updateStageStatus.push(updateStageStatus);
          reject(v);
        }
      })
      .catch(function(err) { // SOAP error on Save Invoice
        console.log('SOAP Error' + JSON.stringify(err));
        updateStageStatus = { "stage" : "GetSupplier", "status": false, "serverStatus" : v.Status, "message" : "Failed to complete GetSupplier", "error": JSON.stringify(err)};
        v.updateStageStatus.push(updateStageStatus);
        reject(v);
      });
    });
  }
