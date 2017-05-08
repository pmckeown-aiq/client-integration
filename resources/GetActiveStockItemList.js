var _ = require('lodash');
var fs = require("fs-extra");
var path = require('path');

module.exports = {
  // Get the codes to validate the input data
  doValidation: function(myName, myCodeToCheck, clientName, coID, objectName, cb) { 
    var appDir = path.dirname(require.main.filename);
    var filename = myName + '.extract.json'
    var file = path.join(appDir + '/clients/' + clientName + '/data/' + coID + '/' + filename);
    if (fs.existsSync(file)) {
      var theseCodes = JSON.parse(fs.readFileSync(file, 'utf8'))
    }
    var myCode = _.filter(theseCodes[0].Result.StockItem, { StockItemID : myCodeToCheck});
    // clear theseCodes (it is a copy of the data file extracted from aiq
    theseCodes = null;
    if (myCode.length === 1) {
      return cb(null, { "code": myCodeToCheck, "exists": true, "data": myCode[0] });
    } else {
      console.log('NOT FOUND STOCK ITEM ' + JSON.stringify(myCode) + ' ' + myCodeToCheck + ' in ' + file );
      return cb(null, { "code": myCodeToCheck, "exists": false });
    }
  }
}
