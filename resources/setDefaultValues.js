'use-strict';
var path = require('path');
var _ = require('lodash');
var fs = require("fs-extra");

// On occasion will need to default current date - so set it up as a variable
var date = new Date();
var dd = date.getDate();
var mm = date.getMonth()+1; //January is 0!
var yyyy = date.getFullYear();
if(dd<10){ dd='0'+dd; } 
if(mm<10){ mm='0'+mm; } 
var today = yyyy + '-' + mm + '-' + dd;

// validate data - accept an API Call name (e.g. GetActiveCustomerList)
// and a code, return the code and a status true/false
// Call a resources file named with the API call, read a data file (API Call.json)
// and pattern match the code. The extraction of the data is done elsewhere
module.exports = setDefaultValue = function(validateObjects,feedTransactionArray, headerSetByValidationValues, lineSetByValidationValues, headerSetStaticDefault, lineSetStaticDefault, cb) {
  var appDir = path.dirname(require.main.filename);
  // need this for the path to the data file
  var clientName = validateObjects.clientName;

  // To support validating data against multiple environments use a coID array
  // when validating we just need to grab a possibly multiple data files which will have coID in the path. We will use the array to read an array of files (which often will just be a single file (when no additional env is specified)(
  var coIDs = [];
  // push the "normal" or primary environment into the coID array 
  coIDs.push({ "coID": validateObjects.coID, "value": "default" });

  // Multiple Environments ... if we have additionalEnv defined we need to validate data against one or other (possibly more in time) coID fields ... all we need to know is:
  // If we have the multiple environments what is the identifier field for the environments. The identifier should tell us what the coID is ... 
  if ( typeof validateObjects.additionalEnvs !== 'undefined' ) {
    console.log('We Have Multiple Environments');
    // additional environments are stored in an array
    validateObjects.additionalEnvs.forEach(function(additionalEnv) {
      // push the additional environment into the coID array
      // and the value of the field that identifies the coID is 
      coIDs.push({ "coID": additionalEnv.coID, "value": additionalEnv.identifiedBy.value });
    })
      console.log('coID array is ' + JSON.stringify(coIDs));
  }
  var config = require(appDir + '/conf/config.js');
  // Array to hold the validation results to be sent back to the client as an array ..
  var invalidData = [];
  headerSetByValidationValues.forEach(function(setByValidation) {
    console.log('set values for ' + JSON.stringify(setByValidation));
    /* Currently supports two types of "defaultValues"
     * set: true - set to a static string
     * getFromValidation: true - go and grab the value based on another object in the transaction ... the object must be a "validateValue" object (so that we have an output file from extractStaticData. The output file will be used to find values matching the "pointer" property for the transaction
     * for example:
     * defaultValue: { getFromValidation:true, getFromObject: "StockItemID", getObjectName: 'DefaultSalesGLAccountCode' }
     * The above is using the DefaultSalesGLAccountCode stored in the StockItemID. We need the transactions StockItemID value to "lookup" the StockItemID's DefaultSalesGLAccountCode value, which is stored in /clients/{clientName}/data/{coID}/ folder. The file is name is defined by validateWith as defined for StockItemID
    */

    // Firstly - the more complex variant - getting from the other properties extracStaticData
    if ( setByValidation.defaultValue.getFromValidation == true ) {
      console.log(JSON.stringify(validateObjects));
      console.log(JSON.stringify(setByValidation.defaultValue.getFromObject));

      var validateWhat = _.filter(validateObjects, { name: setByValidation.defaultValue.getFromObject })
      console.log('We are going to use ' + JSON.stringify(validateWhat));
      if ( validateWhat.length != 1 ) { // should only get one match!
        throw('setDefaultValues had an error - more than one match for possible routines to set default values from!');
      }
      var validateVia = validateWhat[0].name;
      var validateFiles = {} 
      console.log('validateVia ' + JSON.stringify(validateVia));
      // From the config file get the name of the SOAP call that extracts data for this object. The data extracted earlier will be in a file named the same as the soap call 
      var codeMaintenanceSettings = config.codeMaintenanceSettings;
      var thisObject = codeMaintenanceSettings[validateVia];
      var validateWith = thisObject.validateWith;
      console.log('validateWith ' + JSON.stringify(validateWith));
      var invalidMessage = thisObject.invalidMessage;
      // See if we have a "createWith" property for this object - if we do we can create the object on the fly. If not it has to be created in AccountsIQ
      //console.log('called to run the validation data' + validateWith);
      // ToDo - this is in the conf file so should be passed as an argument! 
      if (fs.existsSync(appDir + '/resources/' + validateWith + '.js')) {
        //console.log('GOT ' + validateWith + ' resources file');	  
        // set an empty object up which will be validateFiles.whatIsTheProcedureToExtractCalled - such as "validateFiles.GetActiveCustomerList"
        // we will append coID to this - so it needs to exist ...
        validateFiles[validateWith] = {} 
        // Loop through the coIDs array to load a file for each of the environments (may just be one - may be more than one) 
        coIDs.forEach(function(coID) {
        // array contains a coID and a value - just need the coID
	  myCoID = coID.coID;
          validateFiles[validateWith][myCoID] =  require(appDir + '/clients/'+ clientName + '/data/' + myCoID + '/' + validateWith+'.extract.json');
        })
      } 
    }
    // loop through the transactions ...
    feedTransactionArray.forEach(function(transaction) {
      // first identify if we have multiple companies - we check for validateObjects.
      if ( typeof validateObjects.additionalEnvs !== 'undefined' ) {
        // check for the object in the transactiona array that defines which coID this transaction belongs to
        coIDIdentifier = validateObjects.additionalEnvs[0].identifiedBy.name;
	myEnvironmentIdentifierValue = transaction[coIDIdentifier];
	myCoIDObject = _.filter(coIDs, { value: myEnvironmentIdentifierValue });
	// We should only have one match ...
	if ( myCoIDObject.length === 1 ) {
	  coID = myCoIDObject[0].coID;
	} else if ( myCoIDObject.length === 0 ) {
	  // if no match default to the default coID
          coID = coIDs[0].coID;
	} else {
	  // if we got more than 1 then trouble
          err = 'Error in validateObject.js - we got more than 1 coID identified for transaction ' + JSON.stringify(transaction);
	  return(err);
        }
      } else {
	// the coIDs array will only have one coID - and that will be used for all objects
        coID = coIDs[0].coID;
      }

      if (validateObject.onLines == false ) { // looking for something on the header
        mylineSetByValidationValues.forEach(function(setDefaultValue) {
	  setDefault =  setDefaultValue.name
	  getObject =  setDefaultValue.defaultValue.getObjectName
	        console.log('SET DEFAULT FROM RESULT FOR ' + setDefaultValue.name + ' to ' + JSON.stringify(result['data']));
		// quick loop through lines ...
	        transaction.lines.forEach(function(l) {
		  l[setDefault] = result['data'][getObject];
		  console.log('SSET DEFAULT FOR ' + setDefault + ' ' + result['data'][getObject] );
		});
	      });
	    if ( validateObject.name == "CurrencyCode" ) {
              if ( result.data.IsBaseCurrency !== true ) {
	        // Net to set the currency exchange rate 
	        console.log('SET THE EXCHANGE RATE ' +  JSON.stringify(result.data.ExchangeRate)) 
	        transaction.ExchangeRate = result.data.ExchangeRate;
	      }
	    }
	  }
        });    
      }
      if (validateObject.onLines == true ) { // looking for something on the lines
        transaction.lines.forEach(function(line) {
	  // header set static values ... headerSetStaticDefault
          lineSetStaticDefault.forEach(function(v) {
            console.log(JSON.stringify(v));
            staticObjectName = v.name;
	    // special case for setDateToToday
	    if (v.name == 'setDateToToday' ) { 
              transaction[staticObjectName] = today; // today was set at the start of the script as a variable for today!
            } else {
              line[staticObjectName] = v.defaultValue.set;
	    }
          })
        });
      }
    });
    */
  });
  // return the feedTransactionArray along with the invalidData array ...
  // first though make the invalidData array a unique array (no need to repeat the message!)
  return cb(feedTransactionArray, invalidData);
}
