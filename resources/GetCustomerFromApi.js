var Q = require('q');
var soap = require('soap');
var _ = require('lodash');
var path = require('path');
var appDir = path.dirname(require.main.filename);

// For the log file
var bunyan = require('bunyan');
// Set up the logger for app
var appLog = bunyan.createLogger({
  name: 'integration',
  streams: [{
    path: appDir + '/public/logs/integration.log'
  }]
})

module.exports = getCustomerFromApi = function(options) {
};

getCustomerFromApi.prototype.harvestSalesInvoicesApi = function(invalidItem, options, cb) {
  //console.log('harvestApi in getCustomerFromApi has options ' + JSON.stringify(options));
  //var logFile = options.data.logFileName 
  var apiName = options.processRules.loadFrom;
  // remove double qoute from JSON
  apiName = apiName.replace(/"/g,"");	
  //logFile = logFile.replace(/"/g,"");	
  // Log entry
  //appLog.info('processApiFile:', apiName);
  var config = require(appDir + '/conf/harvest.json')
  console.log(JSON.stringify(config));
  invalidItem = invalidItem.invalidItem;
  console.log('getCustomerFromApi has code ' + JSON.stringify(invalidItem));
  // Get the harvest configuration
  var Harvest = require(appDir + '/harvest.sales/'),
      harvest = new Harvest({
          subdomain: config.harvest.subdomain,
          email: config.harvest.email,
          password: config.harvest.password
      }),
  // Harvest calls a customer a "Client"
  Customer = harvest.Clients;
  // Initialise array
  // For harvest first need to get a list of invoices 
  // Listing has many options to restrict - http://help.getharvest.com/api/invoices-api/invoices/show-invoices/
  console.log('getting : '+ invalidItem.apiValue) 
  console.log('getting : '+ invalidItem.code) 
  //Customer.get({id : invalidItem.apiValue }, function(err, customer) {
  Customer.get({id : invalidItem.code }, function(err, customer) {
    console.log('DID WE GET AN Customer?????');
    console.log(JSON.stringify(customer));
    // The address comes back as a CSV style line
    var address = [];
    // The address may not be populated in Harvest - make sure it exists
    //if ( typeof customer.client.address !== 'undefined' ) {
    if ( customer.client.address !== null ) {
      var addressLines = customer.client.address.split("\n");
      var addressLineCount = addressLines.length;
      // Always assume the first line is Address 1
      var Address1 = addressLines[0]
      // Country is the last line
      var Country = addressLines[addressLineCount - 1]
      // Post code is before the County
      var PostCode = addressLines[addressLineCount - 2]
    }    
    var CurrencyCode = customer.client.currency.slice(-3) ;
    // set the customer fields (aiq Format)
    var apiCustomer = { "Name": customer.client.name, "Address1": Address1, "PostCode": PostCode, "Country": Country, "CurrencyCode": CurrencyCode };
    console.log(JSON.stringify(customer));
    console.log(JSON.stringify(apiCustomer));
    cb(apiCustomer);
  });
}
