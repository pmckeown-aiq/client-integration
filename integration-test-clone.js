'use-strict';
var Q = require('q');
var soap = require('soap');
var fs = require('fs');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var _ = require('lodash');
var async = require('async');
// For the log file
var bunyan = require('bunyan');
// Set up the logger for app
var appLog = bunyan.createLogger({
  name: 'integration',
  streams: [{
    path: appDir + '/public/logs/integration.log'
  }]
})

// Helper files to check hard code values on lookup
var aiqClient = require(appDir + '/resources/aiqClient.js');

var env = require(appDir + '/resources/env.js');

function Integration(opt) {
    this._feedTransactions = opt.feedTransaction;
    this._state = null;
};

Integration.prototype.execute = function () {
    var self = this;
    this._state = setTimeout(function () {
        self.execute();
    }, 100000);
};

Integration.prototype.stop = function () {
    clearTimeout(this._state);
    this._state = null;
};

var integration = new Integration({
    feedTransactions: [
    ],
});

process.on('message', function (options) {
    if (options.op === 'extractStaticData') {
      console.log('client asked to extract static data with ' + JSON.stringify(options));
      env.env({ coID: options.data.coID, type: options.data.type, get: '' }, function(opts) {
        opts = opts.opts;
	// add the client name to the data passed to extractStaticData - needed for the directory structure to write file to
	opts.clientName = options.data.clientName.replace(/"/g,"");
        	
        var extractStaticData = require('./resources/extractStaticData.js');
        var cloneStaticData = require('./resources/cloneStaticData.js');
        cloneStaticData.clone(opts , function(result) {
          console.log('cloneStaticData result ' + JSON.stringify(result));
          if ( result.success == true ) {
            process.send({ extractStaticData: result });
	  } else {
            process.send({ "error" : "error in extractStaticData  " , "data": result }); 
	  }
	});
	      oops;
      })
    }
    else if (options.op === 'loadMap') {
      //console.log('loadMap for '+ JSON.stringify(options));
      // need resources script
      var manageMap = require(appDir + '/resources/manageMap.js');
      manageMap.loadMap(options, function(result) {
        //console.log('Call back loadMap' + JSON.stringify(options.data)); 
	options.mapData = result;
	//console.log(JSON.stringify(options));
        process.send(options);
      });
    }
    else if (options.op === 'updateMap') {
      //console.log('updateMap for '+ JSON.stringify(options));
      // need resources script
      var manageMap = require(appDir + '/resources/manageMap.js');
      manageMap.updateMap(options, function(err, result) {
	if (err) {
          if ( err.constructor === Object ) {
	    console.log('Error returned from manageMap.updateMap object error type ' + JSON.stringify(err))
            process.send({ "error" : "error in manageMap.updateMap  " , "data": JSON.stringify(err)}); 
          } else {
	    console.log('Error returned from manageMap.updateMap ' + err)
            process.send({ "error" : "error in manageMap.updateMap  " , "data": err }); 
          }
	  throw err;
        }
        //console.log('Call back updateMap' + JSON.stringify(options.data) + ' with result ' + JSON.stringify(result)); 
	delete options.op;
	options.mapDataResult = result;
        process.send(options);
      });
    }
    else if (options.op === 'loadData') {
       /*
       LOAD THE DATA READY FOR PROCESSING INTO ACCOUNTSIQ
       That consists of:
       1) Load the data from the source system - this will create an array of data called feedTransactions that may have embedded lines (it will for some API feeds, it will not for CSV files). NOTE - some API fields will have dynamic filters that need to be applied (date restrictions being one example). The filters are held in the conf file entry for the process
       2) Process the data - each client will have their own bespoke script to process data (in their own data structure)
       3) Mapping data - some data will have a "map" file that is maintained within the integration app to convert codes from source system to aIQ formats - typically where supplier codes, departments and product codes have a different format. You can map many (source) to one or one to one, but not easily one (source) to many aIQ
       4) Validate data - some of the objects (supplier codes, departments, tax codes, etc..) once in aIQ format need to be validated. This is done by extracting the data (via extractStaticData - should have already happened) to disk in a JSON file. When the data is processed we will validate it and mark any transactions that fail validation as invalid. They will be displayed to screen but not processed. In some cases (initially suppliers and customers only) the data can be created from the integration app. It depends on aIQ supporting creation through the API
       The data is loaded, and processed, and then the mapping (must happen first - as the map files can supply extra data that is not supplied with the source data, such as an environment if you are updating multiple accountsIQ entities) and finally validated
       5) Then the feedTransactions array is sent to the client to display for the user to review ... Updating it to accountsIQ is a sepearate process! 
      */
      env.env({ coID: options.data.coID, type: options.data.type, get: '' }, function(opts) {
        opts = opts.opts;
	// strip quotes added by client
	options.data.clientName = options.data.clientName.replace(/"/g,"");
	opts.clientName = options.data.clientName.replace(/"/g,"");
	options.data.coID = options.data.coID.replace(/"/g,"");
//        // First we need to sort out what needs to be done to the data when it is loaded from the source 
//        // the opts.clientSettings has two arrays  - headerValues and (if hasLines = true) lineValues.
//	// these have all possible fields but not all of them will be supplied
//	opts.clientSettings.displayHeaderValues = _.filter(opts.clientSettings.headerValues, { "display" : true }); // tells us the header values to be displayed on screen for the end user when reviewing the data
//	opts.clientSettings.getHeaderValueFromMappedData = _.filter(opts.clientSettings.headerValues, [ "suppliedFromMappedData" , true ]); // tells us which of the fields we need to set from the mapped data if any ....
//	// And do the same for the line values ... We keep header and line "rules" seperate as the header and lines in the feedTransactions array will be processed differently (all of the headers get processed in one loop, and within that loop we loop through lines for each transaction ....
//	if ( hasLines = true ) {
//	  opts.clientSettings.displayLineValues = _.filter(opts.clientSettings.lineValues, { "display" : true });
//        }
	// But also need to check if we have any additional values that are stored against this mapped object (originally Axios - Company Identifier was stored as Department in the PurchaseAccountID mapping) ...
        var mapObjects = [];	
	mapHeaderValues = _.filter(opts.clientSettings.headerValues, { "map": true }); // tells us which of the fields we need to map using the "map" files
        mapHeaderValues.forEach(function(value) {
	      getFromMappedObject = _.filter(opts.clientSettings.getHeaderValueFromMappedData, { 'mappedObject': value.name });
              mapObjects.push({ "name": value.name, "onLines": false, "getFromMappedObject": getFromMappedObject });
	});	  
	if ( hasLines = true ) {
	  mapLineValues = _.filter(opts.clientSettings.lineValues, { "map" : true });
	  opts.clientSettings.getLineValueFromMappedData = _.filter(opts.clientSettings.headerValues, [ "suppliedFromMappedData" , true ]);
          mapLineValues.forEach(function(value) {
	    getFromMappedObject = _.filter(opts.clientSettings.getLineValueFromMappedData, { 'mappedObject': value.name });
            mapObjects.push({ "name": value.name, onLines: true, "getFromMappedObject": getFromMappedObject });
	  });	  
	}
	// add the clientName for the path 
	mapObjects.clientName = options.data.clientName.replace(/"/g,"");
	mapObjects.coID = options.data.coID.replace(/"/g,"");
	console.log('MAP OBJECTS ' + JSON.stringify(mapObjects));
	/* now we need to see which of the values (does not matter if a header or line as we do the same regardless) is mapped, and which are validatedi
         objects to validate and map are supplied - so they ar properties of objects in opts.clientSettings.validate(Header/Line)values
	 and they are in the validate property */
        var validateObjects = [];	
	validateHeaderValues = _.filter(opts.clientSettings.headerValues, [ "validate.exists" , true ]); // tells us which of the fields (or object properties) will need to be validated
        validateHeaderValues.forEach(function(value) {
	  if ( value.validate ) {
	    // ok we have a validate property set so see what it is and add to arrays
	    if ( value.validate.exists == true ) { 
	    // then we validate it exists - for matching later record if header or line item 
	    // Also record if the object can be got from API (need to pass the original to the client if it is)
              validateObjects.push({ "name": value.name, "onLines": false, "getFromApi": value.validate.getFromApi });
            }	
	  }
	});	  
	if ( hasLines = true ) {
	  validateLineValues = _.filter(opts.clientSettings.lineValues, [ "validate.exists" , true ]);
	  // repeat for lineValues
          validateLineValues.forEach(function(value) {
	    if ( value.validate ) {
	      // ok we have a validate property set so see what it is and add to arrays
	      if ( value.validate.exists == true ) { 
	      // then we validate it exists
                validateObjects.push({ "name": value.name, "onLines": true, "getFromApi": value.validate.getFromApi });
              }	
	    }
	  });
        }
	// add the clientName for the path 
	validateObjects.clientName = options.data.clientName.replace(/"/g,"");
	validateObjects.coID = options.data.coID.replace(/"/g,"");

	
	// Now sort out the filters for the API feeds
	// Filters to pass through for api feeds
	myFilters = [];
        // Check for any filters passed from client 
        var loadDataFilters = options.data.loadDataFilters;
	//console.log('loadDataFilters is ' + JSON.stringify(loadDataFilters));
	// check if there are any filters (won't be for CSV or flagged as unprocessed API feeds
	if ( loadDataFilters !== undefined ) {
	  for (var i = 0; i < loadDataFilters.length; i++ ) {
            //console.log('WE HAVE A FILTER ' + JSON.stringify(loadDataFilters[i].name));
	    var name = loadDataFilters[i].name
	    //console.log('name is now ' + name);
	    //console.log('CLIENT SENT ' + JSON.stringify(loadDataFilters[i]));
            myFilters.push({ 'name': name, 'value': loadDataFilters[i][name] });
	  };
        };
        // Check the opts for "hard coded" filters for the api call
	//console.log('opts is ' + JSON.stringify(opts.apiSettings.apiFilters));
        if ( opts.hasOwnProperty('apiSettings') ) {
          if ( typeof opts.apiSettings.apiFilters !== "undefined" ) {
	    // Some filters can't be applied to an api all at once. If the api expects a single filter (i.e status=sent) but we want to extract data that has multiple values (so status=sent or status=paid) we need to be a bit different and cause a loop om the data extract ... 
	    // however it will just get pushed to the array (so looks like {"name":"status","loop":true,"value":["sent","paid"]} - as opposed to {"name":"status","value":"paid"}
	    opts.apiSettings.apiFilters.forEach(function(filter) {
	      myFilters.push(filter);
	    })
	  }
	}
	console.log('API FILTERS ARE ' + JSON.stringify(myFilters));

	// LOAD THE DATA FROM THE SOURCE FILE
	// Call the loadData script (load the data and call the process data
	var loadData = require(appDir + opts.processRules.loadDataScript);
	this.loadData = new loadData(this);
	// If we are running loadCsv then need to know if headers exist ...
	if ( opts.processRules.loadFrom == "loadCsv" ) {
	  options.csvNoHeader = opts.processRules.csvNoHeader;
	}
        this.loadData[opts.processRules.loadFrom](options, myFilters, function(err, feedTransactions) {
	  if (err) { 
            if ( err.constructor === Object ) {
	      console.log('Error returned from loadData ' + JSON.stringify(err))
              process.send({ "error" : "error in loadData  " , "data": JSON.stringify(err)}); 
            } else {
	      console.log('Error returned from loadData ' + err)
              process.send({ "error" : "error in loadData  " , "data": err }); 
	    }
	    throw err;
          };
	  // first - need to drop transactions that should be excluded as they contain the marker to say previously updated to accountsIQ
          if (typeof opts.callbackRules.options != 'undefined' ) {
            isAlreadyCalledback = new RegExp(opts.callbackRules.options.value);
	    if (opts.callbackRules.onLines == true) {
	      console.log('in remove');
	      _.forEach(feedTransactions, function(trans) {
	          _.remove(trans.lines, function(line) {
		      console.log('in remove 3 ' + JSON.stringify(line[opts.callbackRules.apiFieldName]));
                      //return line[opts.callbackRules.apiFieldName] == opts.callbackRules.options.value ;
                      return isAlreadyCalledback.test(line[opts.callbackRules.apiFieldName]);
                  });
              });
              // We may have removed all of the lines (as they are already marked as processed ... if so remove the transaction
	      _.remove(feedTransactions, function(trans) {
                      return trans.lines.length == 0;
              });
            } else {
	      // TO DO - callback on headers! 
	    }
          }
          if ( typeof controlTotals === 'undefined' ) {
            var controlTotals = {};
          }
	  controlTotals.transactionFeedCount =  feedTransactions.length;
          // count the lines on the transactions (useful but also necessary when writing back on lines updates back to 3rd Party API
	  controlTotals.transactionLinesCount =  _.flatMap(feedTransactions, 'lines').length;
          process.send({ "controlTotals" : controlTotals });
          // Check that we have actually got some data back ....
	  if ( feedTransactions.length > 0 ) {
	    process.send({ "loadDataStatus": { message: "Completed data extract - got " + feedTransactions.length + " records ... now processing the data to format it for accountsIQ ..." }}); 
	    var processData = require(opts.processRules.processScript);
	    this.processData = new processData(this);
            var feedTransactionArray = [];
	    feedTransactionArray = this.processData[opts.type](feedTransactions, opts);
	    // NEVER NEVER SEND THE FULL OPTIONS !!!!!
	    process.send({ "loadDataStatus": { message: " Completed processing transactions ... now validating the data and applying data maps please wait ..." }}); 
            /* Load the resources files 
            1) Map Objects (CURRENTLY HAPPENS EXTERNALLY)
            2) Calculate values (tax amount from tax rates). Also needs to set the tax code if from AccountID as needs to be validated ... 
            3) Validate the objects (includes setting default values)
            */
            var mapObject = require(appDir + '/resources/mapObject.js');
            //var setDefaultValues = require(appDir + '/resources/setDefaultValues.js');
            var calculateTax = require(appDir + '/resources/calculateTax.js');
            var validateObject = require(appDir + '/resources/validateObject.js');
            // Check if we have more than one database configured
            if ( typeof opts.additionalEnvs !== 'undefined' ) {
              console.log('We have a second database to upload to! ' + JSON.stringify(opts.additionalEnvs));
	      // add the setting to the validateObjects object (this get past to the validateObjects function, it will allow us to choose the path for the extract file which varies by coID (coID is part of the path to the file for the relevant environment
	      validateObjects.additionalEnvs = opts.additionalEnvs;
            }
            // we get back the transaction array and the invalid data array - send them both to the client
	    // for header and lines - first filter out the objects with defaults and then see if they have a "defaultValue.get" property
	    headerSetDefaultValues = _.filter(opts.clientSettings.headerValues, { "supplied" : false, "default" : true })
            headerSetByValidationValues = _.filter(headerSetDefaultValues, function(item){
              return item.defaultValue.getFromValidation === true;
            });
	    lineSetDefaultValues = _.filter(opts.clientSettings.lineValues, { "supplied" : false, "default" : true })
            lineSetByValidationValues = _.filter(lineSetDefaultValues, function(item){
              return item.defaultValue.getFromValidation === true;
            });
	    // generate a list where we are setting the object property to a static value .. 
	    // variable to use to check for static values to be set as defaults
	    checkForStatic = 'defaultValue.set';
	    // arrays of header and lines "set static values"
            headerSetStaticDefault = _.filter(headerSetDefaultValues, function(o) { return _.has(o, checkForStatic); });
            lineSetStaticDefault = _.filter(lineSetDefaultValues, function(o) { return _.has(o, checkForStatic); });
	    /* Now perform data transformation and validation. 
            The async.waterfall method wil be used to allow each operation to complete but at the same time passing the results down the chain of operations (as each operation needs to work on the modified version of feedTransactionArray as modified by the previous stage. First map, then set default values, then calculate and inject tax codes and rates if needed, and finally validate the data in the final version of the transactions array 
	    */
	    async.waterfall([
	      function(callback) {
	        mapObject(mapObjects, feedTransactionArray, function(err, feedTransactionArray) { 
		  if (err) { 
		    if ( err.constructor === Object ) {
	              console.log('Error returned from mapObjects' + JSON.stringify(err))
                      process.send({ "error" : "error in mapObjects " , "data": JSON.stringify(err) }); 
		    } else {
                      process.send({ "error" : "error in mapObjects " , "data": JSON.stringify(err).toString() }); 
	              console.log('Error returned from mapObjects' + err)
	            }
		    throw err;
		  };
		  console.log('Map Objects - no error');
	          callback(null, feedTransactionArray)
	        })
	      },
	      //function(feedTransactionArray, callback) {
	      //  setDefaultValue(validateObjects, feedTransactionArray, headerSetByValidationValues, lineSetByValidationValues, headerSetStaticDefault, lineSetStaticDefault, function(feedTransactionArray) {
	      //    callback(null, feedTransactionArray)
	      //  })
	      //},
	      function(feedTransactionArray, callback) {
		opts.clientName = options.data.clientName.replace(/"/g,"");
	        calculateTax(opts, feedTransactionArray, function(err, feedTransactionArray) { 
		  if (err) { 
                    if ( err.constructor === Object ) {
	              console.log('Error returned from calculateTax ' + JSON.stringify(err))
                      process.send({ "error" : "error in calculateTax  " , "data": err }); 
		    } else {
	              console.log('Error returned from calculateTax ' + err)
                      process.send({ "error" : "error in calculateTax  " , "data": err.toString() }); 
		    }
		    throw err;
		  };
		  console.log('complete calculatetax ' + feedTransactionArray.length);
		  console.log('complete calculatetax ' + JSON.stringify(feedTransactionArray));
	          callback(null, feedTransactionArray)
	        })
	      },
	      function(feedTransactionArray, callback) {
	        validateObject(validateObjects, feedTransactionArray, headerSetByValidationValues, lineSetByValidationValues, headerSetStaticDefault, lineSetStaticDefault, function(err, feedTransactionArray, invalidData) {
		  if (err) { 
                    if ( err.constructor === Object ) {
	              console.log('Error returned from validateObject ' + JSON.stringify(err))
                      process.send({ "error" : "error in validateObject  " , "data": err }); 
		    } else {
	              console.log('Error returned from validateObject ' + err)
                      process.send({ "error" : "error in validateObject  " , "data": err.toString() }); 
		    }
		    throw err;
		  };
	          callback(null, feedTransactionArray, invalidData)
		})
	      }
	     ], function(err,feedTransactionArray, invalidData) {
		console.log('After all processing ' + JSON.stringify(invalidData));
		console.log('After all processing ' + JSON.stringify(feedTransactionArray.length));
		controlTotals.transactionCount = feedTransactionArray.length;
		console.log('After all processing ' + JSON.stringify(feedTransactionArray[1]));
	        feedErrors = _.filter(feedTransactionArray , function (v) {
                  if ( typeof  v.updateStatus !== 'undefined' ) {
                    return v.updateStatus.status === false ;
                  }
                });
		controlTotals.feedErrorsCount = feedErrors.length;
                // count the lines on the transactions (useful but also necessary when writing back on lines updates back to 3rd Party API
	        controlTotals.feedErrorsLinesCount =  _.flatMap(feedErrors, 'lines').length;

                process.send({ "controlTotals" : controlTotals });
                process.send({ "invalidData" : invalidData });
	        process.send({ "feedTransactions": feedTransactionArray, "opts": opts.clientSettings }); 
	        process.send({ "feedErrors": feedErrors, "opts": opts.clientSettings }); 
	        process.send({ "loadDataStatus": { message: "Complete - press OK to continue"}}); 
		// set the array to null
		invalidData = null;
		feedTransactions = null;
	    });
	  }
	  else {
	    process.send({ "feedTransactions": "noTransactions" , "opts": opts.clientSettings }); 
	  }
        });
      });
    }
    else if (options.op === 'getDefaults') {
      env.env({ coID: options.data.coID, type: options.data.type, get: 'connection' }, function(opts) {
	var coID = options.data.coID.replace(/"/g,"");
	console.log('coID is ' + coID);
	console.log('coID is ' + JSON.stringify(options));
	opts = opts.opts;
	console.log(JSON.stringify(opts));
        soap.createClient(opts.connection.url, (err, client) => {
         var aiq = new aiqClient(client, opts.connection.pKey, opts.connection.uKey, coID);
         if ( options.data.object == 'AccountID' ) {
           var myQOperation = Q.all([aiq.GetNewCustomerFromDefaults()])
         } else if ( options.data.object == 'StockItemID' ) {
           var myQOperation = Q.all([aiq.GetNewStockItemFromDefaults()])
         }
         myQOperation
            .then(([result]) => {
	       console.log(' back in integration.js ' + JSON.stringify(result.Result));
	       console.log(' back in integration.js ' + JSON.stringify(result.Result));
               // remove all the blanks
               for(var p in result.Result)
                  if( result.Result[p] === '' )
                     delete result.Result[p]
	       //var myNewCustomer = result;
	       result.Result.Name = 'Created by Import';
               process.send({ getDefaultsResult: result.Result });
            })
            .fail(err => {
               console.log('Error:', errors[err.error])
               console.log('Error:', errors[err.error])
               console.log(err)
            })
            .done();
         })
       });
    }
    else if (options.op === 'stop') {
        integration.stop();
    }
    else if (options.op === 'createInvalidItem') {
      console.log('Going to call createInvalidItem in integration.js with options ' + JSON.stringify(options));
      appLog.info('createInvalidItem:', options.data);
      env.env({ coID: options.data.coID, type: options.data.type, get: '' }, function(opts) {
	var coID = options.data.coID.replace(/"/g,"");
	console.log('coID is ' + coID);
	opts = opts.opts;
	console.log('createInvalidItem receivd ' + JSON.stringify(options));
        objectType = options.data.element.objectType;
        // bring in the resources file - createObject
        var createObject = require('./resources/createObject.js');      
	this.createObject = new createObject(this);
        this.createObject[objectType](opts, options.data.element, function(result){
	  console.log('CAllback for createObject gave result ' + JSON.stringify(result));
	  // Now update the map file for the object if needed 
	  
	  // AccountID : check if the "code" (from api usually!) matches the data.Code
          if ( objectType == "CustomerCode" && options.element.code !== options.element.data.Code ) { 
	    console.log('API code is ' + options.element.code + ' but created ' + objectType + ' with Code ' + options.element.data.Code + ' so need to map ...')
	  }
          process.send({ createdObject: result });
          if ( result.status == "Failure" ) { // we have an error
            process.send({ "error" : "error in createObject. We had a failure." , "data": JSON.stringify(result)});
          }
	})
       });
    }
    else if (options.op === 'getFromApi') {
      env.env({ coID: options.data.coID, type: options.data.type, get: '' }, function(opts) {
	var coID = options.data.coID.replace(/"/g,"");
	console.log('coID is ' + coID);
	var opts = opts.opts;
	var theObject =  options.data.element;
        console.log('Get From API in Integration.js option = ' + JSON.stringify(options));
        console.log('Get From API in Integration.js' + JSON.stringify(theObject));
        var getCustomerFromApi = require(appDir + '/resources/getCustomerFromApi.js');
	      console.log(JSON.stringify(opts.processRules));
        this.getCustomerFromApi = new getCustomerFromApi(this);
        this.getCustomerFromApi[opts.processRules.loadFrom]( theObject, opts, function(apiCustomer) {
          console.log('Got back getCustomerFromApi ' + JSON.stringify(apiCustomer));
	  theObject.details = apiCustomer
          process.send({ 'fetchedFromApi' : theObject });
        }) 
      })
    }
    else if (options.op === 'createTransactions') {
      console.log('We have createTransactions in integration.js with ' + JSON.stringify(options));
      // Load data into accountsIQ
      env.env({ coID: options.data.coID, type: options.data.type, get: '' }, function(opts) {
	opts = opts.opts;
	// opts is the server side variables - need to inject client (options) transactions
	opts.transactions = options.data.transactions;
	var updateData = require(appDir + opts.processRules.updateDataScript);
	var transactionType = opts.processRules.transactionType;
	console.log('transactionType is ' + transactionType);
	this.updateData = new updateData(this);
        this.updateData[transactionType](opts, function (err, data) {
	  if (err) return console.error(err);
          console.log(data.toString());
	  
        });
      });
    }
});

