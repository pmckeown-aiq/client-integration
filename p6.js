var path = require('path');
var _ = require('lodash');
var fs = require("fs-extra");

var clientName = "kefron";
var coID = "kef5964";
var validateWith = "GetTaxCodeList";
var validateWhat = "S";
//var appDir = path.dirname(require.main.filename);
var appDir = '/home/kefron/integration-out/';
var validate = require(appDir + '/resources/' + validateWith + '.js');
// ValidateWhat should be CustomerCode or SupplierCode
console.log('SET LINE TAX CODE FROM ACCOUNT ' + + coID);
validate.doValidation(validateWith,validateWhat, clientName, coID, validateWhat, function(err, result){
  if (typeof result.data != 'undefined' ) {
            console.log('SET TAX CODE FOR LINES ' + JSON.stringify(result.data));
            myTaxCodeForLines = result.data.DefaultTaxCode;
          } else {
        console.log('NO TAX CODE FROM ACCOUNT ' + coID + ' ' + err);
        console.log('NO TAX CODE FROM ACCOUNT ' + coID + ' ' + JSON.stringify(result));
         }
})
