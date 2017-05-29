var _ = require('lodash');
// async for stacking up api calls to external systems
var async = require('async')
// For the log file
var bunyan = require('bunyan');
var path = require('path');
var appDir = path.dirname(require.main.filename);
// Set up the logger for app
var appLog = bunyan.createLogger({
  name: 'integration',
  streams: [{
    path: appDir + '/public/logs/integration.log'
  }]
})
// CSV Stuff
//Converter Class
var Converter = require("csvtojson").Converter;
var fs=require("fs"); 

module.exports = loadData = function(opts) {
};
// Filters are passed through - an array of filters to be applied 
// Although configured for CSV NOT USED (excpect whole file to load)
// My revisit that though! 
loadData.prototype.loadCsv = function(opts, filters, cb) {
  console.log('loadCsv has opts ' + JSON.stringify(opts));
  var logFile = opts.data.logFileName 
  var csvFile = opts.data.file;
  // remove double qoute from JSON
  csvFile = csvFile.replace(/"/g,"");	
  logFile = logFile.replace(/"/g,"");	
  // Log entry
  appLog.info('processCsvFile:', csvFile);
  // check for "noHeader
  var csvNoHeader = opts.csvNoHeader;
  console.log('Have we no header?' + csvNoHeader)
  //new converter instance
  var csvConverter=new Converter({
    noheader: csvNoHeader
  });
  fs.createReadStream('./public/data/' + csvFile).pipe(csvConverter)
  // Load CSV File Records
  var self = this;
  csvConverter.on("end_parsed",function(feedTransactions){
    console.log('Got Number of transactions to return ' + feedTransactions.length);
    appLog.info('sourceTransactionsCount:', feedTransactions.length);
    console.log(JSON.stringify(feedTransactions[0]));
    cb(null, feedTransactions);
  })
}

// Filters are passed through - an array of filters to be applied 
// Will be used in all API based feeds (date ranges, flag to say if loaded 
//
loadData.prototype.harvestSalesInvoicesApi = function(opts, filters, cb) {
  //console.log('harvestApi in loadData has opts ' + JSON.stringify(opts));
  console.log('harvestApi in loadData has filters ' + JSON.stringify(filters));
  var logFile = opts.data.logFileName 
  // remove double qoute from JSON
  logFile = logFile.replace(/"/g,"");	
  // Log entry
  var config = require(appDir + '/conf/harvest.json')
  console.log(JSON.stringify(config));
  console.log('FILTERS WILL BE ' + JSON.stringify(filters));
  // Some filters may require us to loop through the API call (where the API expects a single value, but we want to test multiple values. For example API expects sent=paid but we want sent=paid or sent=somethingElse
  // should be constructed in config file as "loop":true, values:[array of values to test]
  // First filter the "filters" for loop:true
  loopFilters = _.filter(filters, { "loop": true });
  if ( loopFilters.length > 0 ) {
    console.log("we have looping filters"  +  loopFilters.length )
    console.log("we have looping filters"  +  JSON.stringify(loopFilters) )
    // Remove the "loop" filters from the filters list (we will add back in later)
    // lodash removes the filters and returns removed values (so we not catching the return - we just want to remove!
    _.remove(filters, { "loop": true });
    // create an array to hold the properly constructed filters 
    loopHarvestOptions = [];
  }
  // Non Looped Filters ...
  // we should have had  [{"name":"from","value":"20161201"},{"name":"to","value":"20161229"}]
  // Harvest wants them to be passed as { "from": 20161201, "to": 20161229 } 
  var harvestOptions = {};
  filters.forEach(function(filter) {
    // special handlig for dates (from and to) that should come with time zone and time 
    console.log(JSON.stringify(filter));
    if (filter.type == 'date' ) {
      filter.value = filter.value.slice(0, 10);
    }
    harvestOptions[filter.name] = filter.value; 
  })
  // Added 20/03/2017 - updated node-harvest caused problems with a new parameter for paging ... need true 
  console.log("we have harvestOptions"  +  JSON.stringify(harvestOptions) )
  if ( loopFilters.length !== 0 ) {
    // then if we have looping filters loop through ..
    loopFilters.forEach(function(loopFilter) {
      var loopValues = loopFilter.value;
      // loopFilter should have array of values
      //loopFilter.value.forEach(function(loopValue) {
      loopValues.forEach(function(myValue) {
        // clone the harvestOptions (parse/string of JSON - otherwise it is a reference and all values get the last "myValue"! 
        tempHarvestOptions = JSON.parse(JSON.stringify(harvestOptions));
        tempHarvestOptions[loopFilter.name] = myValue;
        loopHarvestOptions.push(tempHarvestOptions);
        console.log('Temp Harvest Option' + JSON.stringify(tempHarvestOptions));
        console.log('loop Harvest Options after push ' + JSON.stringify(loopHarvestOptions));
      })
    })
  } else {
    // We still need a "loopHarvestOptions array to process - set it to a simple one element array which contains the "non-loop" options
    loopHarvestOptions[0] = harvestOptions;
  }

  // OK - so we could know have either a single harvestOptions entry or an array of harvestOptions in loopHarvestOptions
  console.log('harvestOptions is ' + JSON.stringify(loopHarvestOptions));
  console.log('harvestOptions is ' + JSON.stringify(harvestOptions));
  // Get the harvest configuration
  var Harvest = require(appDir + '/harvest.sales/'),
      harvest = new Harvest({
          subdomain: config.harvest.subdomain,
          email: config.harvest.email,
          password: config.harvest.password
      }),
      Invoices = harvest.Invoices,
      Clients = harvest.Clients,
      Projects = harvest.Projects;
  // Initialise array
  // For harvest first need to get a list of invoices 
  // Listing has many opts to restrict - http://help.getharvest.com/api/invoices-api/invoices/show-invoices/
  var feedTransactions = [];
  
  
  // Invoice.list gives us back the following id fields: id, client_id, recurring_invoice_id, estimate_id, retainer_id, created_by_id
  // We use the id to get the full invoice, the client_id to get the customer details. estimate_id and retainer_id exist if created from estimate or retainer (could be used for quotes). The recurring_invoice_id exists if the invoice is a recurring invoice.
  // We can access the Invoice (need to for item invoices), Client (customer details over and above the name - needed for creating new customers), Projects (good for analysis codes/stock item codes, and People (users - for email, first name and last name if needed). 
  // When we access another object we need to do asynchronously (as otherwise we get out of step with the invoice)
  
  // first though need to collate an invoiceArray via multiple calls to the "Invoices.list" function. There may be only one call (no loop in the harvestOptions) or a number of calls that we need to combine (where we have had to "loop" one or more of the harvestOptions. So to get invoices with either a sent or paid status we need to do a call to Invoices.list for status=sent, and another call to Invoices.list for status=paid, and combine the values to a single "invoiceArray" array which we then go off an fetch the detail for ....
  invoiceArray=[]; // array to push invoices to
  async.each(loopHarvestOptions, function(loopOption, cbSetProject) {
    console.log(JSON.stringify(loopOption) + ' async.each')
    Invoices.list(loopOption, function(err, myInvoiceArray) {
      if (err) {
        console.log('ERROR found in async.parallel in loadData');
        process.send({ "error" : "error in loadData  " , "data": err }); 
        throw (err)
       }
       console.log('harvestOptions in async.each is ' + JSON.stringify(loopOption));
       console.log('harvestOptions in async.each array returned ' + JSON.stringify(myInvoiceArray.length));
       invoiceArray.push(myInvoiceArray);
       cbSetProject();
     }); 
  }, function(err) {
    //if (err) {
    //  console.log('ERROR found in async.parallel in loadData');
    //  process.send({ "error" : "error in loadData  " , "data": err }); 
    //  throw (err)
    //}
    var invoicesListed = 0;
    console.log('Got Invoice List: ' + invoiceArray.length);
    //console.log('Initial List: ' + JSON.stringify(invoiceArray));
    // now we need to "flatten" arrays returned from loop ..
    invoiceArray = [].concat.apply([], invoiceArray);
    console.log('Initial List: ' + invoiceArray.length);
    // Got nothing back
    if (invoiceArray.length == 0) {
      // cb is the callback for loadData.prototype.harvestApi that returns to the calling "integration.js" 
      cb(null, feedTransactions);
    }
    // We have data - so now loop through, get the invoice detail, the client detail and then finally for lines the project detail ...
    invoiceArray.forEach(function(inv, cbInvoiceArray) {
      // comes as "inv.invoices" 
      inv = inv.invoices;
      // Get the client and the invoice as parallel calls 
      async.parallel([
        // cb is the sign that the call is finished for Invoices and Client "get"
        function(cb) {
          // Go Grab the client
          Clients.get({"id": inv.client_id }, function(err,clients) {
    	    // callback if error in the Client.get
            if (err) {
  	      console.log('ERROR:' + JSON.stringify(err) );
  	      return cb(err, null);
  	    }
            inv.client = clients.client;
            console.log('Invoice with client ' + JSON.stringify(inv));
            // done with the client - issue the cb callback signal!
            cb();
          });
        }, 
        function(cb) {
          // In parallell to Client.get - Invoice.get
          // cb is the sign that the call is finished for Invoices and Client "get"
    	  console.log('Get invDetail for ' +  inv.id);
          Invoices.get({id : inv.id}, function(err, invDetail) {
            if (err) {
  	      console.log('ERROR:' + JSON.stringify(err) );
  	      return cb(err, null);
  	    }
            var invDetail = invDetail.invoice;
            console.log('DID WE GET AN INVOICE?????')
            console.log(JSON.stringify('inv.id ' + inv.id + ' detail:' + invDetail));
            // Strip out carriage returns
            console.log('INVOICE CSV WAS ' + JSON.stringify(invDetail.csv_line_items));
            invDetail.csv_line_items = invDetail.csv_line_items.replace(/(\r\n|\r)/gm,"");
            invDetail.csv_line_items = invDetail.csv_line_items.replace(/\"/g, '')
            // we are going to turn that car crash of output into a key value pair array of lines - first add a "invoice.lines" array 
            invDetail.lines = [];
            // Now split csv_line_items by new line into array
            var lines = invDetail.csv_line_items.split("\n");
            console.log('lines are ' + JSON.stringify(lines));
            var lineHeaders = lines[0];
            console.log('lineHeaders is ' + lineHeaders);
            // split the headers to an array
            lineHeadersArray = lineHeaders.split(",");
            lineHeadersArray.forEach(function(header) {
              console.log('We have a line header ' + header) ;
            });
            // Chop the header line (it is the "column names" - listed above
            lines.splice(0, 1);
            // and trailing blank
            lines.splice(lines.length -1, 1);
            console.log('lines are ' + JSON.stringify(lines));
            // for each line
            //async.forEach(lines, function(line, callback) {
            lines.forEach(function(line) {
              // convert to array 
              console.log('ASYNC LINE ' + JSON.stringify(line));
              lineAmountArray = line.split(",");
              // and then match to the "lineHeadersArray" array to get key pair values
              console.log('Amount Array: ' + JSON.stringify(lineAmountArray));
              console.log('Header Array: ' + JSON.stringify(lineHeadersArray));
              thisLine = {};
              _.each(lineHeadersArray,function(k,i){
                thisLine[k] = lineAmountArray[i].replace(/,/g, '');});
                console.log('An invoice line ' + JSON.stringify(thisLine));
                invDetail.lines.push(thisLine);
            });
            // All we need to add to the original object is the lines and project (the rest of invDetail was already there! 
            inv.lines = invDetail.lines;
            // done with the client - issue the cb callback signal!
            cb();
          });
        }
        // now close off the async.parallel function set with its function (accepting err)
        ], function(err) {
          if (err) return (err)
          // Not great - but after the async.parallel to get the Client and actual Invoice Lines (from Invoices.get) now need to loop through lines to get projects - could not get it to work inside a forEach loop inside the async.parallel
          // run through an async.each loop ...
          async.each(inv.lines, 
    	    function(line, cbSetProject) {
              // And then get the project  - `the line that we now have will have a project_id. we need to grab the project details and add that (mainly for the name/code - as that is likely to be used for analysis. But the project also has lots of useful fields such as whether it is billable, what the budget is, our we over budget, the start and end date, the hourly rate ...
              Projects.get({id : line.project_id}, function(err, project) {
                console.log('Project is ' + JSON.stringify(project));
                line.project = project.project;
  	        // We are  
                console.log('line is ' + JSON.stringify(line));
                cbSetProject();
              }); 
            }, function(err) {
    	      // Add to the array and increment counter
  	      // may need to fake a project ... as if it does not exist the processData falls over on safeEval
              console.log(JSON.stringify(inv));
  	      inv.lines.forEach(function(line) {
  	        if ( line.project_id == '' || line.project_id == 'false' ) {
  	          fakeProject = { "id": "notExists", "client_id": "notExists", "name": "notExists", "code": "notExists", "active": "notExists", "billable": "notExists", "bill_by": "notExists", "hourly_rate": "notExists", "budget": "notExists", "budget_by": "notExists", "notify_when_over_budget": "notExists", "over_budget_notification_percentage": "notExists", "over_budget_notified_at": "notExists", "show_budget_to_all": "notExists", "created_at": "notExists", "updated_at": "notExists", "starts_on": "notExists", "ends_on": "notExists", "estimate": "notExists", "estimate_by": "notExists", "hint_earliest_record_at": "notExists", "hint_latest_record_at": "notExists", "notes": "notExists", "cost_budget": "notExists", "cost_budget_include_expenses": "notExists" }
                  line.project = fakeProject
  	        } 
  	      });
              feedTransactions.push(inv);
              invoicesListed++;
              console.log('inv after async parallel is pushed into feedTransactions');
              console.log('FEED TRANSACTIONS:' + JSON.stringify(feedTransactions));
              console.log('invoices length = ' + invoiceArray.length);
  	      console.log('invoicesListed = ' + invoicesListed);
  	      //console.log('API Feed is ' + JSON.stringify(feedTransactions));
  	      // check if we got to the end of the expected number of invoices ..
  	      if(invoicesListed === invoiceArray.length) {
                cb(null, feedTransactions);
              }
            }
          ); // close the async.each for lines get for Projects
        }); // close the async.parallel for Client and Invoices "get"
      }); // End invoiceArray.forEach
    } // End callback for the loopHarvestOptions async.each
  ) // end loopHarvestOptions async.each 
}

loadData.prototype.harvestExpensesApi = function(opts, filters, cb) {
  var logFile = opts.data.logFileName 
  // remove double qoute from JSON
  logFile = logFile.replace(/"/g,"");	
  // Log entry
  var config = require( appDir + '/conf/harvest.json')
  console.log(JSON.stringify(config));
  console.log('FILTERS WILL BE ' + JSON.stringify(filters));
  // Some filters may require us to loop through the API call (where the API expects a single value, but we want to test multiple values. For example API expects sent=paid but we want sent=paid or sent=somethingElse
  // should be constructed in config file as "loop":true, values:[array of values to test]
  // First filter the "filters" for loop:true
  loopFilters = _.filter(filters, { "loop": true });
  loopHarvestOptions = [];
  if ( loopFilters.length > 0 ) {
    console.log("we have looping filters"  +  loopFilters.length )
    console.log("we have looping filters"  +  JSON.stringify(loopFilters) )
    // Remove the "loop" filters from the filters list (we will add back in later)
    // lodash removes the filters and returns removed values (so we not catching the return - we just want to remove!
    _.remove(filters, { "loop": true });
    // create an array to hold the properly constructed filters 
  }
  // Non Looped Filters ...
  // we should have had  [{"name":"from","value":"20161201"},{"name":"to","value":"20161229"}]
  // Harvest wants them to be passed as { "from": 20161201, "to": 20161229 } 
  var harvestOptions = {};
  filters.forEach(function(filter) {
    // special handlig for dates (from and to) that should come with time zone and time 
    if (filter.name == "from" || filter.name == "to") {
      filter.value = filter.value.slice(0, 10);
    }
    harvestOptions[filter.name] = filter.value; 
  })

  console.log("we have harvestOptions"  +  JSON.stringify(harvestOptions) )
  // then if we have looping filters loop through ..
  console.log('loopFilters.length is ' + loopFilters.length);
  if ( loopFilters.length !== 0 ) {
    loopFilters.forEach(function(loopFilter) {
      var loopValues = loopFilter.value;
      // loopFilter should have array of values
      //loopFilter.value.forEach(function(loopValue) {
      loopValues.forEach(function(myValue) {
        // clone the harvestOptions (parse/string of JSON - otherwise it is a reference and all values get the last "myValue"! 
        tempHarvestOptions = JSON.parse(JSON.stringify(harvestOptions));
        tempHarvestOptions[loopFilter.name] = myValue;
        loopHarvestOptions.push(tempHarvestOptions);
        console.log('Temp Harvest Option' + JSON.stringify(tempHarvestOptions));
        console.log('loop Harvest Options after push ' + JSON.stringify(loopHarvestOptions));
      })
    })
  } else {
    // We still need a "loopHarvestOptions array to process - set it to a simple one element array which contains the "non-loop" options
    loopHarvestOptions[0] = harvestOptions;
  }

  // OK - so we could know have either a single harvestOptions entry or an array of harvestOptions in loopHarvestOptions
  console.log('harvestOptions is ' + JSON.stringify(loopHarvestOptions));
  // Get the harvest configuration
  var Harvest = require(appDir + '/harvest.purchases/'),
    harvest = new Harvest({
      subdomain: config.harvest.subdomain,
      email: config.harvest.email,
      password: config.harvest.password
    }),
    Reports = harvest.Reports,
    People = harvest.People,
    Projects = harvest.Projects,
    ExpenseCategories = harvest.ExpenseCategories
  ;
  // Initialise array
  // For harvest first need to get a list of expenses 
  // Listing has many opts to restrict - http://help.getharvest.com/api/invoices-api/invoices/show-invoices/
  var feedTransactions = [];
  
  
  // People.list gives us back the following id fields: id, email, first_name, last_name
  // We use the id to get the expenses report.
  // We map the email to the AccountsIQ supplier account
  // 
  
  personsArray=[]; // array to push People to
  console.log('loopHarvestOptions : ' + JSON.stringify(loopHarvestOptions));
  async.each(loopHarvestOptions,
    // cb is the sign that the call is finished for Invoices and Client "get"
    function(loopOption, cbSetProject) {
      People.list(null, function(err, myPersonsArray) {
        console.log('harvestOptions in async.each is ' + JSON.stringify(loopOption));
        console.log('harvestOptions in async.each array returned ' + JSON.stringify(myPersonsArray.length));
        personsArray = myPersonsArray;
        cbSetProject();
      }); 
    }, function(err) {
      // variable to check how many people with expenses have been returned
      var personsListed = 0;
      // variable to check how many lines we expect to be returned ...
      var expectedLines = 0;
      var processedLines = 0;
      console.log('Got Persons List: ' + personsArray);
      //console.log('Initial List: ' + JSON.stringify(invoiceArray));
      // now we need to "flatten" arrays returned from loop ..
      personsArray = [].concat.apply([], personsArray);
      console.log('Initial List: ' + personsArray);
      // Got nothing back
      if (personsArray.length == 0) {
        // cb is the callback for loadData.prototype.harvestApi that returns to the calling "integration.js" 
        // NEED TO ERROR THIS INSTEAD - IF NO PEOPLE DEFINED WE HAVE A PROBLEM!
        cb(null, feedTransactions);
      }
      // We have data - so now loop through, get the invoice detail, the client detail and then finally for lines the project detail ...
      personsArray.forEach(function(person, cbPersonsArray) {
        console.log(JSON.stringify(person));
        // comes as "person.user" 
        person = person.user;
        // Get the persons expenses (wrapped in async.parallel - but only actually one action!
        async.parallel([
          // cb is the sign that the call is finished for 
          function(cb) {
            // Go Grab the expenses
    	    console.log('Get Expenses for ' +  person.id);
            // use the harvestOptions.to date as the invoice date
	    person.invoice_date = harvestOptions.to;
    	    console.log('Set Expenses Invoice Date for ' +  person.id + ' as ' + person.invoice_date);
            // expensesByUser needs the user_id added to the options (they should be date ranges ...) 
            harvestOptions.user_id = person.id;
            Reports.expensesByUser(harvestOptions, function(err,expenses) {
              if (err) {
  	        console.log('ERROR:' + JSON.stringify(err) );
  	        console.log('Callback :' + JSON.stringify(err) );
  	        return cb(err, null);
  	      }
              expenses = expenses.map(function(line) {
                return line.expense;
              });
              person.lines = expenses
              console.log('Person with expenses ' + JSON.stringify(expenses));
              console.log('Person with expenses ' + JSON.stringify(person));
              // done with the client - issue the cb callback signal!
              cb();
            });
          } 
        // now close off the async.parallel function set with its function (accepting err)
        ], function(err) {
          if (err) {
	    console.log('ERROR found in async.parallel in loadData');
	    process.send({ "error" : "error in loadData  " , "data": err }); 
            throw (err)
          }
          // run through an async.each loop ... (person is supplier is invoice!)
          async.each(person.lines, 
    	    function(line, cbSetDetails) {
              // Then in parallel go and get the category detail and the project detail (each line should have an expenses category ID and may if billable have a project category id
              async.parallel([
                function(cb2) {
                  // And then get expense categories (stock items). Once again we don't get anything useful like a code .. we get an internal "expense_category_id" which is no use to man nor beast! 
                  ExpenseCategories.get({id : line.expense_category_id}, function(err, expenseCategory) {
                    console.log('ExpenseCategories is ' + JSON.stringify(expenseCategory.expense_category.name));
                    line.expenseCategory = expenseCategory.expense_category;
                    cb2();
                  }); 
                },
                function(cb2) {
                  // And then get the project  - `the line that we now have will have a project_id. we need to grab the project details and add that (mainly for the name/code - as that is likely to be used for analysis. But the project also has lots of useful fields such as whether it is billable, what the budget is, our we over budget, the start and end date, the hourly rate ...
                  Projects.get({id : line.project_id}, function(err, project) {
                    console.log('Project is ' + JSON.stringify(project.project.name));
                    line.project = project.project;
                    cb2();
                  }); 
                }
              ], function(err) {
                if (err) return (err);
                cbSetDetails(); 
              }) // end err for asynch parallell
              // counter for the number of expeced lines              
              console.log('async each for person');
              expectedLines++;
              console.log('Expected Lines' + expectedLines);
            }, function (err) {
              // We have a list of persons - but they may have zero expense lines ... only push them into the arrauy if person.lines.length > 0
              if ( person.lines.length > 0 ) {
                feedTransactions.push(person);
              }
	      processedLines += person.lines.length;
              console.log('FEED TRANSACTIONS:' + JSON.stringify(feedTransactions.length));
              console.log('Processed Line Count: ' + processedLines);
              console.log(JSON.stringify(feedTransactions[0]));
              if(expectedLines === processedLines) {
                cb(null, feedTransactions);
              }
	    }); // end async.each for lines ....
          }); 
      }); // End invoiceArray.forEach
    } // End callback for the loopHarvestOptions async.each
  ) // end loopHarvestOptions async.each 
}
