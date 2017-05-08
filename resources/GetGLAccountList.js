var _ = require('lodash');
var fs = require("fs-extra");
var path = require('path');
// Needed to match GL Codes Only (using _.contains)
var includes = require('lodash.includes');

module.exports = {
  doValidation: function(myName, myCodeToCheck, clientName, coID, objectName, cb) {
    var filename = myName + '.extract.json'
    var appDir = path.dirname(require.main.filename);
    var file = path.join(appDir + '/clients/' + clientName + '/data/' + coID + '/' + filename);
    if (fs.existsSync(file)) {
     var theseCodes = JSON.parse(fs.readFileSync(file, 'utf8'))
    }
    //var myCode = _.filter(theseCodes[0].Result.ArrayOfString, { string : myCodeToCheck});
    // The SOAP return for GL Codes is very odd - so need to do a complex search
    // el should loop through "code,code description"
    // so then need to pattern match
    var myCode = _.filter(theseCodes[0].Result.ArrayOfString,function (obj) {
      return _.values(obj).some(function (el) {
	if ( _.includes(JSON.stringify(el), JSON.stringify(myCodeToCheck)) == true ) {
          return 1;
        }
      }); 
    }); 
    theseCodes = null; // clear the data loaded from file
    if (myCode.length === 1) {
      return cb(null,{ "code": myCodeToCheck, "exists": true, "data": myCode[0] });
    } else {
      return cb(null,{ "code": myCodeToCheck, "exists": false });
    }
  }
}
