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

module.exports = AttachDocument = function(v) {
    return new Promise(function(resolve, reject) {
    //console.log('in attachDocument' + JSON.stringify(v));
    //console.log('transationID ' + JSON.stringify(v.transactionID));
    if ( typeof v.AttachDocument !== 'undefined' ) {
      var document = { "Header": {"MasterType": "SalesInvoice", "MasterID": v.transactionID, "Filename": "Kefron Invoice Details.xlsx" } }
      //console.log('Going to attach document ' + v.AttachDocument);
      //console.log('transationID ' + JSON.stringify(document));
      document.Content = {};
      document.Content.Content = base64_encode(v.AttachDocument);
      document.Content.Comments = 'Attached by data import';
      //console.log('transationID ' + JSON.stringify(document));
      Promise.all([aiq.AttachDocument({ "document": document })])
        .then((result) => {
          updateStageStatus = { "stage" : "AttachDocument", "status": true, "serverStatus" : result[0].Status, "error" : result[0].ErrorMessage, "message" : "Attach document complete", "transactionID" : v.transactionID };
          v.updateStageStatus.push(updateStageStatus);
          //console.log('Resolve attachDocument' + JSON.stringify(v)); 
          resolve(v);
        })
        .catch(function(err) { // SOAP error on Save Invoice
          //console.log('SOAP Error' + JSON.stringify(err));
          updateStageStatus = { "stage" : "AttachDocument", "status": false, "serverStatus" : v.Status, "message" : "Failed to complete AttachDocument.", "error": JSON.stringify(err) };
          v.updateStageStatus.push(updateStageStatus);
          reject(v);
        });
    } else {
      //console.log('No AttachDocument property - no attaching!');
      resolve(v);
    }
    });
  }
