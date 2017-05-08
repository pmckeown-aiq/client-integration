// fs required for attaching documents
var fs = require('fs-extra');

module.exports = prepareUpdate = function(v) {
  // GetSupplier - based on a invoice with SupplierCode - get AccountID
  return new Promise(function(resolve, reject) {
  console.log('in GetSupplier' + JSON.stringify(v));
    resolve(v);
  });
}
