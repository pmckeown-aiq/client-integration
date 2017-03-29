'use-strict';
var path = require('path');
var _ = require('lodash');
var fs = require("fs");

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
// Call a helper file named with the API call, read a data file (API Call.json)
// and pattern match the code. The extraction of the data is done elsewhere
module.exports = validateObject = function(validateObjects, feedTransactionArray, headerSetByValidationValues, lineSetByValidationValues, headerSetStaticDefault, lineSetStaticDefault, cb) {
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
  validateObjects.forEach(function(validateObject) {
    //console.log('read file for ' + JSON.stringify(validateObject));
    var validateWhat = validateObject.name;
    var validateFiles = {} 
    //console.log('validateWhat ' + JSON.stringify(validateWhat));
    // From the config file get the name of the SOAP call that extracts data for this object. The data extracted earlier will be in a file named the same as the soap call 
    var codeMaintenanceSettings = config.codeMaintenanceSettings;
    var thisObject = codeMaintenanceSettings[validateWhat];
    var validateWith = thisObject.validateWith;
    //console.log('validateWith ' + JSON.stringify(validateWith));
    var invalidMessage = thisObject.invalidMessage;
    // See if we have a "createWith" property for this object - if we do we can create the object on the fly. If not it has to be created in AccountsIQ
    //console.log('called to run the validation data' + validateWith);
    // ToDo - this is in the conf file so should be passed as an argument! 
    if (fs.existsSync(appDir + '/helper/' + validateWith + '.js')) {
      //console.log('GOT ' + validateWith + ' helper file');	  
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
    //console.log(JSON.stringify(validateFiles[validateWith]));
    // Validate Objects
    // as part of the validation we need to see if we have to "{ default:true, defaultValue: {get: validateWith } objects in the opts
    // because - as we are looping through the transactions (and can get the objects data to pull the "defaulting" fields from and feed them back into the transaction in this process then this is the best place to do it ... 
    // Now we need to loop through feedTransactions 
    console.log('WE HAVE validateObject ' + JSON.stringify(validateObject.name));
    // Check what defaults we have only for the current validateObject
    var myName = validateObject.name
    myheaderSetByValidationValues = _.filter(headerSetByValidationValues, function(item){
      return item.defaultValue.getFromObject == myName ;
    });
    mylineSetByValidationValues = _.filter(lineSetByValidationValues, function(item){
      return item.defaultValue.getFromObject == myName ;
    });
    console.log('WE HAVE for ' + myName + ' myheaderSetByValidationValues ' + JSON.stringify(myheaderSetByValidationValues));
    console.log('WE HAVE for ' + myName + ' mylineSetByValidationValues ' + JSON.stringify(mylineSetByValidationValues));
    // loop through the transactions ...
    feedTransactionArray.forEach(function(transaction) {
      // first identify if we have multiple companies - we check for validateObjects.
      if ( typeof validateObjects.additionalEnvs !== 'undefined' ) {
        // check for the object in the transactiona array that defines which coID this transaction belongs to
        coIDIdentifier = validateObjects.additionalEnvs[0].identifiedBy.name;
	console.log('Look for ' + JSON.stringify(coIDIdentifier));
	console.log('in ' + JSON.stringify(transaction));
	myEnvironmentIdentifierValue = transaction[coIDIdentifier];
	myCoIDObject = _.filter(coIDs, { value: myEnvironmentIdentifierValue });
	console.log('myCoIDObject has length ' + myCoIDObject.length)
	// We should only have one match ...
	if ( myCoIDObject.length === 1 ) {
	  coID = myCoIDObject[0].coID;
	  console.log('myCoID is ' + coID);
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
      console.log('coID is ' + coID );
      // header set static values ... headerSetStaticDefault
      headerSetStaticDefault.forEach(function(v) {
        console.log('Header:Set Static Default Values ' + v.name );
        console.log(JSON.stringify(v));
        staticObjectName = v.name;
	// special case for setDateToToday
	if (v.defaultValue.set == "setDateToToday" ) { 
          transaction[staticObjectName] = today; // today was set at the start of the script to be todays date in YYYY-MM-DD
        } else {
          transaction[staticObjectName] = v.defaultValue.set;
        }
      })
      if (validateObject.onLines == false ) { // looking for something on the header
        //console.log('looking for object ' + validateObject.name + ' from ' + JSON.stringify(validateObject.name));
        var validate = require(appDir + '/helper/' + validateWith + '.js');
	if ( typeof validateObject.getFromApi !== undefined ) {
	  var getFromApi = validateObject.getFromApi;
	} else {
	  var getFromApi = false;
	}
        // we use the object specific helper file to do the validation as there is some specific "tricks" for various objects ... this will return a result object. The result object needs to get sent to the client (for the "Invalid Objects" table with info about can it be created and can the details be gotten from API ... pass through the transaction value .. 
        validate.doValidation(validateWith,transaction[validateObject.name], clientName, coID, validateObject.name, function(result){
          console.log('Header:Do Validation ' + validateObject.name + '  ..' + transaction[validateObject.name] );
	  console.log('Got result for data validation ' + JSON.stringify(result.length));
	  // if code does not exist
	  if (result.exists == false) { 
	    //console.log(JSON.stringify(result));
            if ( thisObject.hasOwnProperty('createWith') ) {
              // then the object is creatable from the integration app
              result.canCreate = true;
            } else {
              result.canCreate = false;
            }
            if ( thisObject.hasOwnProperty('abortRun') ) {
              // then the object is creatable from the integration app
              result.abortRun =  thisObject.abortRun;
            } else {
              result.abortRun = false;
            }
            result.objectType = validateWhat;
            result.invalidMessage = invalidMessage;
            // flag to say if the invalid item can be retrieved from api
	    result.getFromApi = getFromApi;
            if ( getFromApi == true ) {
	      saveOld = [validateObject.name] + '_getFromApiValue';
	      console.log(JSON.stringify('look for ' + saveOld));
              result.apiValue = transaction[saveOld];
	    
	    }
  	    //console.log(JSON.stringify(result));
	    // Flag the transaction as incorrect
	    transaction.isCorrect = { 'status': false, 'error': result.invalidMessage };
            // add the result to the array for the client
	    invalidData.push(result);
	  } else {
	    //We have a result
	    // Currency code check ... 
	    // If the getObjectName = CurrencyCode and result.IsBaseCurrency = false, then we need to get the Exchange Rate and pass that back into the transaction line. We need to ensure that only a single currency is on all lines seperatley
            console.log('VALIDATE OBJECT NAME ' + validateObject.name);
	      console.log('Got true for data validation ' + JSON.stringify(result));
	      console.log('SET DEFAULT ' + JSON.stringify(myheaderSetByValidationValues));
	      myheaderSetByValidationValues.forEach(function(setDefaultValue) {
		setDefault =  setDefaultValue.name
		getObject =  setDefaultValue.defaultValue.getObjectName
	        console.log('SET DEFAULT FROM RESULT FOR ' + setDefaultValue.name + ' to ' + JSON.stringify(result['data']));
	        transaction[setDefault] = result['data'][getObject];
		console.log('SSET DEFAULT FOR ' + transaction[setDefault] + ' ' +  result['data'][getObject] );
	      })
	      // WITHIN HEADERS - we may need to set line values to a default from a header record (can not set a header value to a default from within lines though! 
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
          //console.log('looking for object ' + validateObject.name + ' from ' + JSON.stringify(validateObject.name));
          //console.log(line[validateObject.name]);
          var validate = require(appDir + '/helper/' + validateWith + '.js');
          //console.log(JSON.stringify(validate));
          // we use the object specific helper file to do the validation as there is some specific "tricks" for various objects ... this will return a result object. The result object needs to get sent to the client (for the "Invalid Objects" table with info about can it be created and can the details be gotten from API ... pass through the transaction line value .. 
          validate.doValidation(validateWith,line[validateObject.name], clientName, coID, validateObject.name, function(result){
            console.log('Lines:Do Validation ' + validateObject.name + '  ..' + line[validateObject.name] );
            console.log('Lines:Do Validation ' + validateObject.name + '  ..' + line['NetAmount'] );
	    console.log('Got result for data validation ' + JSON.stringify(result));
	    // if code does not exist
	    if (result.exists == false) { 
              if ( thisObject.hasOwnProperty('createWith') ) {
                // then the object is creatable from the integration app
                result.canCreate = true;
              } else {
                result.canCreate = false;
              }
              if ( thisObject.hasOwnProperty('abortRun') ) {
                // then the object is creatable from the integration app
                result.abortRun =  thisObject.abortRun;
              } else {
                result.abortRun = false;
              }
              result.objectType = validateWhat;
              result.invalidMessage = invalidMessage;
              // flag to say if the invalid item can be retrieved from api
              result.getFromApi = getFromApi;
  	      // Flag the transaction as incorrect
  	      line.isCorrect = { 'status': false, 'error': result.invalidMessage };
  	      // but also flag the transaction as incorrect ...
	      transaction.isCorrect = { 'status': false, 'error': result.invalidMessage };
              // add the result to the array for the client
  	      //console.log(result.apiValue);
  	      invalidData.push(result);
            } else {
	      // We have a valid code
	      // loop through the mylineSetByValidationValues array to set values
	      console.log('Got true for data validation ' + JSON.stringify(result));
	      console.log('SET DEFAULT ' + JSON.stringify(mylineSetByValidationValues));
	      mylineSetByValidationValues.forEach(function(setDefaultValue) {
		setDefault =  setDefaultValue.name
		getObject =  setDefaultValue.defaultValue.getObjectName
	        console.log('SET DEFAULT FROM RESULT FOR ' + setDefaultValue.name + ' to ' + JSON.stringify(result['data']));
	        line[setDefault] = result['data'][getObject];
		console.log('LINE AFTER DEFAULT is ' + JSON.stringify(line));
	      })
	    }
          });    
        });
      }
    });
  });
  // return the feedTransactionArray along with the invalidData array ...
  // first though make the invalidData array a unique array (no need to repeat the message!)
  invalidData = _.uniqBy(invalidData,'code');
  return cb(feedTransactionArray, invalidData);
}
