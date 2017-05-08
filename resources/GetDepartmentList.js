var _ = require('lodash');
var fs = require("fs-extra");
var path = require('path');

module.exports = {
  doValidation: function(myName, myCodeToCheck, clientName, coID, objectName, cb) {
    var filename = myName + '.extract.json'
    var appDir = path.dirname(require.main.filename);
    var file = path.join(appDir + '/clients/' + clientName + '/data/' + coID + '/' + filename);
    if (fs.existsSync(file)) {
      var theseCodes = JSON.parse(fs.readFileSync(file, 'utf8'))
    }
    var myCode = _.filter(theseCodes[0].Result.Department, { DepartmentID : myCodeToCheck});
    theseCodes = null; // clear the data loaded from file
    if (myCode.length === 1) {
      return cb(null,{ "code": myCodeToCheck, "exists": true, "data": myCode[0] });
    } else {
      return cb(null,{ "code": myCodeToCheck, "exists": false });
    }
  }
}
