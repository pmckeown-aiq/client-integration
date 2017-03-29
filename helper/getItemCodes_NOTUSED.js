var _ = require('lodash');
var fs = require("fs");
var path = require('path');

var filename = 'GetActiveStockItemList.extract.json';
var appDir = path.dirname(require.main.filename);
var file = path.join(appDir , 'clients', clientName , '/data/', filename);

if (fs.existsSync(file)) {
  var theseCodes = JSON.parse(fs.readFileSync(file, 'utf8'))
}

module.exports = {
  getItemCodeFromProductName: function(myCodeToCheck) {
    var myCode = _.filter(theseCodes[0].Result.StockItem, { StockItemID : myCodeToCheck});
    theseCodes = null; // clear the data loaded from file
    if (myCode.length === 1) {
      var myReturn = (JSON.stringify(myCode[0]));
      return myCode[0];
      //return myReturn.replace(/\"/g, '\'')
    };
  }
}
