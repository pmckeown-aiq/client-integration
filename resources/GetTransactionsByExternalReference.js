// fs required for attaching documents
var fs = require('fs-extra');

// required for GetTransactionsByExternalReference
var _ = require('lodash');

module.exports = GetTransactionsByExternalReference = function(v) {
    // GetTransactionsByExternalReference returns two objects on resolve - v (the object passed when called) and an array of invoices matched to the v.ExternalReference
    return new Promise(function(resolve, reject) {
    console.log('in GetTransactionsByExternalReference' + JSON.stringify(v));
    var query = {};
    query.ExternalReference = v.ExternalReference;
    if ( typeof v.GetTransactionsTransactionType !== 'undefined' ) { 
      query.TypesFilter = {};
      query.TypesFilter.int = [];
      query.TypesFilter.int.push(v.GetTransactionsTransactionType);
    }
    if ( typeof v.AccountID !== 'undefined' ) { 
      query.AccountIDsFilter = {};
      query.AccountIDsFilter.int = [];
      query.AccountIDsFilter.int.push(parseInt(v.AccountID));
    }
    console.log('GetTransactions query is ' + JSON.stringify(query));
    Promise.all([aiq.GetTransactionsByExternalReference({ "query" : query })])
      .then((result) => {
        console.log('Resolve GetTransactionsByExternalReference' + JSON.stringify(result[0])); 
        console.log('Check Result null ' + result[0]);
        if (result[0].Result) {
          if (result[0].Result.WSTransactionSummary) {
            console.log('Check Result - ' + JSON.stringify(result[0].Result.WSTransactionSummary));
            if ( result[0].Result.WSTransactionSummary.length > 0 ) {
              var transactionIDs = _.map(result[0].Result.WSTransactionSummary, 'TransactionID');
	
              updateStageStatus = { "stage" : "GetTransactionsByExternalReference", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : result[0].Result.WSTransactionSummary.length + " transactions returned", "transactionID" : transactionIDs };
              v.updateStageStatus.push(updateStageStatus);
              console.log('resolve GetTransactionsByExternalReference ' + JSON.stringify(v) + ' as v and as i ' + JSON.stringify(result[0].Result.WSTransactionSummary));
              resolve({ "fetchedVia": v, "fetchedTransactions": result[0].Result.WSTransactionSummary});
            }
          }
        } else {
          console.log('Does not mean failed' + JSON.stringify(result[0]));
          if ( result[0].Status == "Success" ) {
            console.log('It was a success');
            updateStageStatus = { "stage" : "GetTransactionsByExternalReference", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Get Transactions Found No Transactions with External Reference: " + v.ExternalReference, "transactionID" : []};
            v.updateStageStatus.push(updateStageStatus);
            // return an empty invoice array ...
            resolve({ "fetchedVia": v, "fetchedTransactions": []});
          } else {
            updateStageStatus = { "stage" : "GetTransactionsByExternalReference", "status": false, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Get Transactions Failed: " + result[0].ErrorCode};
            v.updateStageStatus.push(updateStageStatus);
            reject(v);
          } 
        }
      })
      .catch(function(err) { // SOAP error on Save Invoice
        console.log('SOAP Error' + JSON.stringify(err));
        updateStageStatus = { "stage" : "GetTransactionsByExternalReference", "status": false, "serverStatus" : v.Status, "message" : "Failed to complete GetTransactionsByExternalReference", "error": JSON.stringify(err)};
        v.updateStageStatus.push(updateStageStatus);
        reject(v);
      });
    });
  }
