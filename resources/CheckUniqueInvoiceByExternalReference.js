// fs required for attaching documents
var fs = require('fs-extra');

// required for GetTransactionsByExternalReference
var _ = require('lodash');

module.exports = CheckUniqueInvoiceByExternalReference = function(v) {
    // Use GetTransactionsByExternalReference - so can check by customer/supplier
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
    //console.log('GetTransactions query is ' + JSON.stringify(query));
    return new Promise(function(resolve, reject) {
      //console.log('Running CheckUniqueInvoiceByExternalReference for ' + v.ExternalReference + ' with flag ' + v.uniqueExternalReferences);
      if (v.uniqueExternalReferences == true ) {
        Promise.all([aiq.GetTransactionsByExternalReference({query: query})])
          .then((result) => {
            //console.log('Result from GetTransactionsByExternalReference ' + v.ExternalReference + ' ' + JSON.stringify(result[0]));
            if (result[0].Status == 'Success' ) {
              if (result[0].Result) {
                if (result[0].Result.WSTransactionSummary) {
                  if ( result[0].Result.WSTransactionSummary.length > 0 ) {
                    //console.log('going to reject ' );
                    updateStageStatus = {"stage": "CheckUniqueInvoiceByExternalReference", "status": false, "serverStatus" : "Error", "error" : "TransactionExists", "message" : "Already exists." + result[0].Result.WSTransactionSummary.length + " transaction(s) exist with that reference. Transactions must have unique external references." };
                    v.updateStageStatus.push(updateStageStatus);
                    //console.log('UpdateStageStatuse ' + v.updateStageStatus);
                    //console.log("going to reject " + JSON.stringify(v.updateStageStatus));
                    reject(v);
                  } else {
                    updateStageStatus = {"stage" : "CheckUniqueInvoiceByExternalReference", "status": true, "serverStatus" : result[0].Status, "message" : "Passed validation that external reference is unique" };
        	    v.updateStageStatus.push(updateStageStatus);
                    //console.log('UpdateStageStatuse ' + v.updateStageStatus);
                    //console.log('UpdateStageStatuse ' + updateStageStatus);
                    resolve(v);
                  }
                }
              } else {
                //console.log("was a success but null Invoice returned");
                updateStageStatus = {"stage" : "CheckUniqueInvoiceByExternalReference", "status": true, "serverStatus" :result[0].Status, "message" : "Passed validation that external reference is unique" };
                v.updateStageStatus.push(updateStageStatus);
                    //console.log('UpdateStageStatuse ' + v.updateStageStatus);
                resolve(v);
              }
            } else {
              updateStageStatus = {"stage" : "CheckUniqueInvoiceByExternalReference", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Check external reference is unique was not a success" };
              v.updateStageStatus.push(updateStageStatus);
                    //console.log('UpdateStageStatuse ' + v.updateStageStatus);
              resolve(v);
            }
          }, function() {
            //console.log("REJECT PROMISE FOR THE CheckUniqueInvoiceByExternalReference - send it back to the client");
          });
      } else {
        // Don't need to ensure unique external references
        resolve(v);
      }
    }, function() {
      //console.log('REJECT PROMISE FOR THE CheckUniqueInvoiceByExternalReference - send it back to the client');
    });
  }
