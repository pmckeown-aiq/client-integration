// fs required for attaching documents
var fs = require('fs-extra');

module.exports = CreateGeneralJournal = function(v) {
    return new Promise(function(resolve, reject) {
    console.log('in CreateGeneralJournal' + JSON.stringify(v));
    Promise.all([aiq.CreateGeneralJournal({ journal: v })])
      .then((result) => {
        console.log('Resolve CreateGeneralJournal' + JSON.stringify(result[0].Status)); 
        if ( result[0].Status == "Success" ) {
          v.transactionID = result[0];
          updateStageStatus = { "stage" : "CreateGeneralJournal", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Transaction Saved" };
          v.updateStageStatus.push(updateStageStatus);
          resolve(v);
        } else {
          updateStageStatus = { "stage" : "CreateGeneralJournal", "status": false, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Transaction Save Failed: " + result[0].ErrorCode};
          v.updateStageStatus.push(updateStageStatus);
          reject(v);
        }
      })
      .catch(function(err) { // SOAP error on Save Invoice
        console.log("SOAP Error" + JSON.stringify(err));
        updateStageStatus = { "stage" : "CreateGeneralJournal", "status": false, "serverStatus" : v.Status, "message" : "Failed to complete CreateGeneralJournal", "error": JSON.stringify(err)};
        v.updateStageStatus.push(updateStageStatus);
        reject(v);
      });
    });
  }
