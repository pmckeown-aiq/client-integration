// fs required for attaching documents
var fs = require('fs');
var path = require('path');

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

module.exports = callback = function(v, opts) {
  var self = this;
  console.log('in callback 1');
  return new Promise(function(resolve, reject) {
    if ( opts.callbackRules) {
      if ( opts.callbackRules.allowed == true ) {
        console.log('calling callback function ' + opts.callbackRules.callbackFunction)
        var appDir = path.dirname(require.main.filename);
        var callbackScript = require(appDir + '/resources/' + opts.callbackRules.script);
        self.callbackScript = new callbackScript(self);
        //this.callback[opts.callbackRules.callbackFunction](opts, v, function(err, wroteBack) {
        Promise.all([self.callbackScript[opts.callbackRules.callbackFunction](opts, v)])
	  .then((result) => {
	    console.log('Result in callback ' + JSON.stringify(result));
            if ( result[0].status === false ) {
              // error in writing back the data 
              updateStageStatus = { "stage" : "CallBack", "status": false, "serverStatus" : result, "error" : "N/A", "message" : 'Call Back Errors' };
            } else {
              // no error
              if (result[0].warning === true ) {
              // but have warning - one or more of the callbacks failed
              updateStageStatus = { "stage" : "CallBack", "status": false, "serverStatus" : result, "error" : "N/A", "message" : 'Call Back Warnings - some errors on some transactions: ' };
              } else { 
                // no error no warning
                updateStageStatus = { "stage" : "CallBack", "status": true, "serverStatus" : result, "error" : "N/A", "message" : 'Call Back Successful' };
              }
            }
            // updateStatus - typically set in updateData rather than one of the "resources" functions - picking up on rejections of promises. But callback may have one error on one of many transactions so the promise is not rejected (at the moment!) ... typically last stage and would want it to be a recoverable erorr
            v.updateStatus = {};
            v.updateStatus.status = updateStageStatus.status;
            v.updateStageStatus.push(updateStageStatus);
            console.log('in callback v is ' + JSON.stringify(v));
            resolve(v);
          })
      } else {
          console.log('No callback 1 - record nothing');
          resolve(v);
      }
    } else {
        console.log('No callback 2 - record nothing');
        resolve(v);
    }
  });
}
