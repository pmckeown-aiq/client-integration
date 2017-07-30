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

module.exports = GetInvoicesByExternalReference = function(v) {
    // GetInvoicesByExternalReference returns two objects on resolve - v (the object passed when called) and an array of invoices matched to the v.ExternalReference
    return new Promise(function(resolve, reject) {
    //console.log('in GetInvoicesByExternalReference' + JSON.stringify(v));
    Promise.all([aiq.GetInvoicesByExternalReference({ externalReference: v.ExternalReference })])
      .then((result) => {
        //console.log('Resolve GetInvoicesByExternalReference' + JSON.stringify(result[0])); 
        //console.log('Check Result null ' + result[0]);
        if (result[0].Result) {
          //console.log('Check Result - ' + result[0].Result );
          if (result[0].Result.Invoice) {
            if ( result[0].Result.Invoice.length > 0 ) {
              //console.log('GetInvoicesByExternalReference returned:' + JSON.stringify(result[0].Result.Invoice.length));
              // fetch out the transaction ID's
              var transactionIDs = _.map(result[0].Result.Invoice, 'InvoiceID');
              updateStageStatus = { "stage" : "GetInvoicesByExternalReference", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : result[0].Result.Invoice.length + " transactions returned", "transactionID" : transactionIDs };
              v.updateStageStatus.push(updateStageStatus);
              //console.log('resolve GetInvoicesByExternalReference ' + JSON.stringify(v) + ' as v and as i ' + JSON.stringify(result[0].Result.Invoice));
              resolve({ "fetchedVia": v, "fetchedInvoices": result[0].Result.Invoice});
            }
          }
        } else {
          //console.log('Does not mean failed' + JSON.stringify(result[0]));
          if ( result[0].Status == "Success" ) {
            //console.log('It was a success');
            updateStageStatus = { "stage" : "GetInvoicesByExternalReference", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Get Invoices Found No Invoices with External Reference: " + v.ExternalReference, "transactionID" : []};
            v.updateStageStatus.push(updateStageStatus);
            // return an empty invoice array ...
            resolve({ "fetchedVia": v, "fetchedInvoices": []});
          } else {
            updateStageStatus = { "stage" : "GetInvoicesByExternalReference", "status": false, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Get Invoices Failed: " + result[0].ErrorCode};
            v.updateStageStatus.push(updateStageStatus);
            reject(v);
          } 
        }
      })
      .catch(function(err) { // SOAP error on Save Invoice
        //console.log('SOAP Error' + JSON.stringify(err));
        updateStageStatus = { "stage" : "GetInvoicesByExternalReference", "status": false, "serverStatus" : v.Status, "message" : "Failed to complete GetInvoicesByExternalReference", "error": JSON.stringify(err)};
        v.updateStageStatus.push(updateStageStatus);
        reject(v);
      });
    });
  }
