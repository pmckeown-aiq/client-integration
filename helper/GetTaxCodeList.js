var _ = require('lodash');
var fs = require("fs");
var path = require('path');


module.exports = {
  doValidation: function(myName, myCodeToCheck, clientName, coID, objectName, cb) {
	  console.log('TAX CODE VALIDATION FOR COID ' + coID );
    var filename = myName + '.extract.json'
    var appDir = path.dirname(require.main.filename);
    var file = path.join(appDir + '/clients/' + clientName + '/data/' + coID + '/' + filename);
    if (fs.existsSync(file)) {
      var theseCodes = JSON.parse(fs.readFileSync(file, 'utf8'))
    }
    // Make the rate 6 decimal places
    // Corless (and possibly others) supply a rate rather than a code
    // Have a problem with Rates in that you may have more than one code set to a rate - we will just return the first one! 
    if ( objectName == "TaxRate" ) {
      myCodeToCheck = myCodeToCheck.toFixed(6);
      var myCode = _.filter(theseCodes[0].Result.Tax, { Rate : myCodeToCheck});
      theseCodes = null; // clear the data loaded from file
      if (myCode.length >= 1) {
        return cb(null, { "code": myCodeToCheck, "exists": true, "data": myCode[0] });
      } else {
        return cb(null, { "code": myCodeToCheck, "exists": false });
      }
    }
    else {
      var myCode = _.filter(theseCodes[0].Result.Tax, { Code : myCodeToCheck});
      theseCodes = null; // clear the data loaded from file
      if (myCode.length === 1) {
        return cb(null, { "code": myCodeToCheck, "exists": true, "data": myCode[0] });
      } else {
 console.log('NOT FOUND TAX CODE ' + JSON.stringify(myCode) + ' ' + myCodeToCheck + ' in ' + file );
        return cb(null, { "code": myCodeToCheck, "exists": false });
      }
    }
  }
}
