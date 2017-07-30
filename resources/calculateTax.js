var path = require('path');
var _ = require('lodash');
var fs = require("fs-extra");

module.exports = calculateTax = function(opts, feedTransactionArray, cb) {
  console.log('in calculate tax 1');
  // Needed to read rules for getting tax codes from accountID
  var appDir = path.dirname(require.main.filename);
  var config = require(appDir + '/conf/config.js');
  var clientName = opts.clientName.replace(/"/g,"");
  var coID = opts.coID.replace(/"/g,"");
  var coIDs = [];
  // push the "normal" or primary environment into the coID array 
  coIDs.push({ "coID": coID, "value": "default" });
  if ( typeof opts.additionalEnvs !== 'undefined' ) {
    // additional environments are stored in an array
    opts.additionalEnvs.forEach(function(additionalEnv) {
      // push the additional environment into the coID array
      // and the value of the field that identifies the coID is 
      coIDs.push({ "coID": additionalEnv.coID, "value": additionalEnv.identifiedBy.value });
    })
  }
  /* Tax Code Check ... 
   * We may have supplied a tax code on the feed, or we may have supplied to the lines by defaulting in from StockItemID ... We may even have tried to supply if from the CustomerCode/SupplierCode on the header ... but the header version does not populate through to the lines (when i set defaults I do "header defaults" with "header values" and "line for line"
   * And we may have the tax code coming from the CustomerCode/SupplierCode (Sales or Purchase). That needs to be grabbed as it would be for data validation (via the extractStaticData files
   * Finally we may get a tax amount and need to calculate the rate (and then lookup a code) ... NOT YET SUPPORTED
  */

  var isTaxCodeSupplied = [];
  isTaxCodeSupplied = _.filter(opts.clientSettings.lineValues, { name: "TaxCode", supplied: false })
  console.log('in calculate tax 2');
  if ( isTaxCodeSupplied.length >= 1 ) {
    isUseAccountTaxCode = _.filter(opts.clientSettings.headerValues, { name: "UseAccountTaxCode", supplied: false, default:true })
    if ( isUseAccountTaxCode.length >= 1 ) {
      // Ok this is a bit messy! Need to try to shift this into validateObjects as that loops through lines ... but for now 
      process.send({ "loadDataStatus": { message: "Setting tax codes ... please wait ..." }}); 
      console.log('USING ACCOUNT TAX CODE - do forEach');
      feedTransactionArray.forEach(function(transaction) {
        if ( typeof opts.additionalEnvs !== 'undefined' ) {
          // check for the object in the transactiona array that defines which coID this transaction belongs to
          coIDIdentifier = opts.additionalEnvs[0].identifiedBy.name;
          myEnvironmentIdentifierValue = transaction[coIDIdentifier];
	  ////console.log('I AM FOR ENVIRONMENT ' + myEnvironmentIdentifierValue);
	  myCoIDObject = _.filter(coIDs, { value: myEnvironmentIdentifierValue });
	  // We should only have one match ...
	  if ( myCoIDObject.length === 1 ) {
	    coID = myCoIDObject[0].coID;
	  } else if ( myCoIDObject.length === 0 ) {
	    // if no match default to the default coID
            coID = coIDs[0].coID;
	  } else {
	    // if we got more than 1 then trouble
            err = 'Error in calculateTax.js - we got more than 1 coID identified for transaction ' + JSON.stringify(transaction);
	    return(err);
          }
        } else {
          // the coIDs array will only have one coID - and that will be used for all objects
          coID = coIDs[0].coID;
        }

        // Get the account tax code ... need to use the CustomerCode/SupplierCode 
        if ( typeof transaction.SupplierCode !== 'undefined' ) {
	  var validateWhat = 'SupplierCode';
	} else {
	  var validateWhat = 'CustomerCode';
	}
        var codeMaintenanceSettings = config.codeMaintenanceSettings;
        var thisObject = codeMaintenanceSettings[validateWhat];
        var validateWith = thisObject.validateWith;
	validateFiles = {};
        validateFiles[validateWith] = {}
        if (fs.existsSync(appDir + '/resources/' + validateWith + '.js')) {
          coIDs.forEach(function(coID) {
	    // array contains a coID and a value - just need the coID
	    myCoID = coID.coID;
	    if (fs.existsSync(appDir + '/clients/'+ clientName + '/data/' + myCoID + '/' + validateWith+'.extract.json')) {
              validateFiles[validateWith][myCoID] =  require(appDir + '/clients/'+ clientName + '/data/' + myCoID + '/' + validateWith+'.extract.json');
             } else {
               cb(new Error("In calculateTax for calculating tax from rate does not exist - " + "/clients/" + clientName + "/data/" + myCoID + "/" + validateWith + ".extract.json"))
             }
          })
	}
        var validate = require(appDir + '/resources/' + validateWith + '.js');
	// ValidateWhat should be CustomerCode or SupplierCode
	//console.log('SET LINE TAX CODE FROM ACCOUNT ' + myCoID + ' ' + coID);
        validate.doValidation(validateWith,transaction[validateWhat], clientName, coID, validateWhat, function(err, result){
	  if (typeof result.data != 'undefined' ) {
            ////console.log('SET TAX CODE FOR LINES ' + JSON.stringify(result.data));
	    myTaxCodeForLines = result.data.DefaultTaxCode;
          } else {
	////console.log('NO TAX CODE FROM ACCOUNT ' + coID + ' ' + err);
	////console.log('NO TAX CODE FROM ACCOUNT ' + coID + ' ' + JSON.stringify(result));
	////console.log('NO TAX CODE FROM ACCOUNT ' + coID + ' ' + JSON.stringify(transaction));
	    myTaxCodeForLines = 'notFound-setby-' + validateWhat;
	  }
          transaction.lines.forEach(function(line) {
            line.TaxCode = myTaxCodeForLines;
            ////console.log('LINE TAX CODE ' + JSON.stringify(line.TaxCode));
          });
        })
      });
    }
  }

  var isTaxRateSupplied = [];
  isTaxRateSupplied = _.filter(opts.clientSettings.lineValues, { name: "TaxRate", supplied: false })
  if ( isTaxRateSupplied.length >= 1 ) {
    if ( isTaxRateSupplied[0].default == true ) {
      if ( isTaxRateSupplied[0].defaultValue.getFromValidation == true ) {
        // Ok this is a bit messy! Need to try to shift this into validateObjects as that loops through lines ... but for now 
        process.send({ "loadDataStatus": { message: "Setting tax rates ... please wait ..." }}); 
        feedTransactionArray.forEach(function(transaction) {
          if ( typeof opts.additionalEnvs !== 'undefined' ) {
            // check for the object in the transactiona array that defines which coID this transaction belongs to
            coIDIdentifier = opts.additionalEnvs[0].identifiedBy.name;
            myEnvironmentIdentifierValue = transaction[coIDIdentifier];
	    ////console.log('I AM FOR ENVIRONMENT ' + myEnvironmentIdentifierValue);
	    myCoIDObject = _.filter(coIDs, { value: myEnvironmentIdentifierValue });
	    // We should only have one match ...
	    if ( myCoIDObject.length === 1 ) {
	      coID = myCoIDObject[0].coID;
	    } else if ( myCoIDObject.length === 0 ) {
	      // if no match default to the default coID
              coID = coIDs[0].coID;
	    } else {
	      // if we got more than 1 then trouble
              err = 'Error in calculateTax.js - we got more than 1 coID identified for transaction ' + JSON.stringify(transaction);
	      return(err);
            }
          } else {
            // the coIDs array will only have one coID - and that will be used for all objects
            coID = coIDs[0].coID;
          }
	
          transaction.lines.forEach(function(line) {
            var validateWhat = isTaxRateSupplied[0].defaultValue.getFromObject;
            var codeMaintenanceSettings = config.codeMaintenanceSettings;
            var thisObject = codeMaintenanceSettings[validateWhat];
            var validateWith = thisObject.validateWith;
	    validateFiles = {};
            validateFiles[validateWith] = {}
            if (fs.existsSync(appDir + '/resources/' + validateWith + '.js')) {
              coIDs.forEach(function(coID) {
	        // array contains a coID and a value - just need the coID
	        myCoID = coID.coID;
		if (fs.existsSync(appDir + '/clients/'+ clientName + '/data/' + myCoID + '/' + validateWith+'.extract.json')) {
                  validateFiles[validateWith][myCoID] =  require(appDir + '/clients/'+ clientName + '/data/' + myCoID + '/' + validateWith+'.extract.json');
                } else {
                  cb(new Error("In calculateTax for calculating tax from rate does not exist - " + "/clients/" + clientName + "/data/" + myCoID + "/" + validateWith + ".extract.json"))
                }
              })
	    }
	    ////console.log('TAX CODE CHECK FOR ' + JSON.stringify(line))
            var validate = require(appDir + '/resources/' + validateWith + '.js');
	    // ValidateWhat should be CustomerCode or SupplierCode
            validate.doValidation(validateWith,line[validateWhat], clientName, coID, validateWhat, function(err,result){
              ////console.log(JSON.stringify(err));
              ////console.log(JSON.stringify(result));
	      if ( typeof result.data != 'undefined' ) {
	        myTaxCodeForLines = result.data.Rate;
                line.TaxRate = myTaxCodeForLines;
	      } // Non Fatal error so no callback here ...
            })
          });
        });
      } // end the if checking getFromValidation
    } // end if checking that set rate from code
  } // end setting TaxRate


  // Check if TaxAmount is calculated (sometimes we get it - sometimes we need to set it by code
  // the code gives us the rate - and only after validation do we have the rate ...
  var isTaxAmountCalculated = [];
  isTaxAmountCalculated = _.filter(opts.clientSettings.lineValues, { name: "TaxAmount", calculate: true })
  if ( isTaxAmountCalculated.length >= 1 ) {		
    process.send({ "loadDataStatus": { message: "Calculating tax amounts ... please wait ..." }}); 
    var safeEval = require('safe-eval');
    // Ok this is a bit messy! Need to try to shift this into validateObjects as that loops through lines ... but for now 
    feedTransactionArray.forEach(function(transaction) {
      transaction.lines.forEach(function(line) {
        line.TaxAmount = safeEval(isTaxAmountCalculated[0].calculateRule, {line: line})
        line.TaxAmount = parseFloat(line.TaxAmount).toFixed(2);
      });
    }); 
  }
  return cb(null, feedTransactionArray);
}
