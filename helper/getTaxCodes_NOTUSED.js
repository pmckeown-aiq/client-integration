var _ = require('lodash');
var fs = require("fs");
var path = require('path');

var filename = 'GetTaxCodeList.extract.json'
var appDir = path.dirname(require.main.filename);
var file = path.join(appDir , 'clients', clientName , '/data/', filename);
if (fs.existsSync(file)) {
  var theseCodes = JSON.parse(fs.readFileSync(file, 'utf8'))
}

module.exports = {
  getCodeFromRate: function(myCodeToCheck) {
    // Make the rate 6 decimal places
    myCodeToCheck = myCodeToCheck.toFixed(6);
    var myCode = _.filter(theseCodes[0].Result.Tax, { Rate : myCodeToCheck});
    if (myCode.length === 1) {
      return JSON.stringify(myCode[0]);
    };
  }
}
