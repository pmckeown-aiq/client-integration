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

module.exports = writeBack = function(v, opts) {
  return new Promise(function(resolve, reject) {
    if ( opts.writeBackRules) {
      if ( opts.writeBackRules.allowed == true ) {
        console.log('calling writeBack function ' + opts.writeBackRules.writeBackFunction)
        var appDir = path.dirname(require.main.filename);
        var writeBack = require(appDir + '/resources/' + opts.writeBackRules.script);
        this.writeBack = new writeBack(this);
        //this.writeBack[opts.writeBackRules.writeBackFunction](opts, v, function(err, wroteBack) {
        Promise.all([this.writeBack[opts.writeBackRules.writeBackFunction](opts, v)])
	  .then((result) => {
            console.log('Looks Bad in writeBack' + JSON.stringify(result));
            //updateStageStatus = { "stage" : "WriteBack", "status": false, "serverStatus" : "N/A", "error" : result, "message" : "Write Back Rules Not Defined: " };
            //v.updateStageStatus.push(updateStageStatus);
            //reject(v);
            updateStageStatus = { "stage" : "WriteBack", "status": true, "serverStatus" : "N/A", "error" : "N/A", "message" : result };
            v.updateStageStatus.push(updateStageStatus);
            resolve(v);
          })
      } else {
          updateStageStatus = { "stage" : "WriteBack", "status": true, "serverStatus" : "N/A", "error" : "N/A", "message" : "Write Back Rules Say Not Required: " };
          v.updateStageStatus.push(updateStageStatus);
          reject(v);
      }
    } else {
        updateStageStatus = { "stage" : "WriteBack", "status": true, "serverStatus" : "N/A", "error" : "N/A", "message" : "Write Back Rules Not Defined: " };
        v.updateStageStatus.push(updateStageStatus);
        reject(v);
    }
  });
}
