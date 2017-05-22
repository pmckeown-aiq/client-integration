var path = require('path');
var appDir = path.dirname(require.main.filename);
console.log('App Dir is ' + appDir);
var _ = require('lodash');
var clone = require('clone');
var fs = require("fs-extra");
var safeEval = require('safe-eval');
// Bespoke to customer - depends on the dates in the input data
// Pass in a date in the format they use and return it as YYYY-MM-DD

function formatDate(inputDate) {
  if ( typeof inputDate !== 'undefined' ) {
    if ( typeof inputDate !== 'string' ) {
      inputDate = inputDate.toString();
    }
    dateParts = inputDate.split('/');
    res = dateParts[2] + '-' + dateParts[1] + '-' + dateParts[0];
    return res;
    return res;
  }
}

function isValidDate(inputDate) {
  var regEx = /^\d{4}-\d{2}-\d{2}$/;
  return inputDate.match(regEx) != null;
}

module.exports = processData = function (feedTransactions) {
};

processData.prototype.CorlessInvoices = function(feedTransactions, opts, options, cb) {
  console.log('Running Process Data');
  // Arrays to store data
  var feedTransactionArray = [];

  // Sanity Check Variables
  // Count of invoice lines and invoices, sum of NetAmount, TaxAmount and GrossAmount
  // variables
  console.log('reset the control totals');
  var countInvoiceLines = 0;
  var countInvoices = 0;
  var sumNetAmount = 0;
  var sumTaxAmount = 0;
  var sumGrossAmount = 0;
  // The header for epic defined by the date and the ExtRef column 
  console.log(JSON.stringify(feedTransactions));
  headerValues = _.filter(opts.clientSettings.headerValues, { "supplied" : true });
  lineValue = _.filter(opts.clientSettings.lineValues, { "supplied" : true });
  // first - "pick" out the ExtRef and the date field from the array  
  headers = _.map(feedTransactions, _.partialRight(_.pick, 'Reservationnumber' ));
  // then by a bit of magic (not sure how!) we convert that to a unique array by ExtRef and Invoice Date
  //uniqueHeaders = _.map( _.uniq( _.map(uniqueHeaders, function(obj){ return JSON.stringify(obj); })), function(obj) { return JSON.parse(obj); });
  uniqueHeaders = _.uniqBy(headers, 'Reservationnumber');
  console.log('HEADERS ' + JSON.stringify(uniqueHeaders));
  uniqueHeaders.forEach(function(header) {
    invLines = _.filter(feedTransactions, header);
    // Construct an invoice header
    //invoiceHeader = {'ExternalReference' : invLines[0].Reservationnumber , 'InvoiceDate' : InvoiceDate , 'OrderDate' : OrderDate , 'CustomerCode' : invLines[0].Dccode.toUpperCase() }
    var header = invLines[0];
    invoice = {};
    headerValues.forEach(function(myValue) {
      //console.log('Evaluate ' + myValue.name + ' ' + myValue.value);
      invoice[myValue.name] = safeEval(myValue.value, {header : header})
    });
    console.log('header is ' + JSON.stringify(invoice));
    invoice.lines = [];
    invLines.forEach(function(line) {
      var aiqLine = {}; // empty the line that we are to construct
      // the conf file should say if it is a line value ...
      console.log('line is ' + JSON.stringify(line));
      lineValue.forEach(function(myValue) {
        //console.log('Evaluate ' + myValue.name + ' ' + myValue.value);
        aiqLine[myValue.name] = safeEval(myValue.value, {line : line})
      });
      // StockItemPrice is rather odd - it may come from either Newprice or Totalinternalprice - so hard coded in 
      var Newprice = Number(line.Newprice);
      //var Totalinternalprice = Number(res.Totalinternalprice.replace(/[^0-9\.]+/g,""));
      console.log(JSON.stringify(line));
      var Totalinternalprice = Number(line.Totalinternalprice);
      if ( line.Newprice != 0 ) {
	console.log('Newprice is not 0 for ' + line.Reservationnumber);
	console.log('Newprice is ' + line.Newprice);
        aiqLine.StockItemPrice = line.Newprice;
      }
      else {
        aiqLine.StockItemPrice = line.Totalinternalprice;
      }
      console.log(JSON.stringify(aiqLine));
      // We will have to retain Parentid and Reservedresourceid for matching discounts to lines
      aiqLine.ParentID = line.Parentid; 
      aiqLine.ReservedResourceID = line.Reservedresourceid; 
      // Push the line formatted for aiq into the invoice ...
      // Exclude lines where the StockItemPrice is 0 - we can get them ...
      if ( aiqLine.StockItemPrice != 0  ) {
        invoice.lines.push(aiqLine);
      }
    });
    console.log('Before discount check lines are ' + JSON.stringify(invoice.lines));
    var discountLines = _.filter(invoice.lines, { "GLAccountCode" : ''  });
    console.log(invoice.ExternalReference + ' DISCOUNT LINES LENGTH ' + discountLines.length);
    var vatStdLines = _.filter(invoice.lines, { "GLAccountCode" : '9999' });
    //console.log(invoice.ExternalReference + ' STD VAT LINES LENGTH ' + vatStdLines.length);
    var vatReducedLines = _.filter(invoice.lines, { "GLAccountCode" : '9998' });
    //console.log(invoice.ExternalReference + ' REDUCED VAT LINES LENGTH ' + vatReducedLines.length);
    var vatLines = _.merge(vatStdLines, vatReducedLines);
    console.log(invoice.ExternalReference + ' ALL VAT LINES LENGTH ' + vatLines.length);
    // Remove the discount, vat (both types) from the invLines array
    _.remove(invoice.lines, { "GLAccountCode" : ''  })
    _.remove(invoice.lines, { "GLAccountCode" : '9999'  });
    _.remove(invoice.lines, { "GLAccountCode" : '9998'  });
    discountLines.forEach(function(v){ 
      // Will need to convert the Amount to a Rate when we match it to a line
      v.DiscountAmount = ( -1 * v.StockItemPrice );
      v.Notes = v.StockItemDescription;
      delete v.GLAccountCode; 
      delete v.StockItemDescription;
      delete v.ReservedResourceID;
    });
    console.log(invoice.ExternalReference + ' has Discount lines ' + JSON.stringify(discountLines));
    vatLines.forEach(function(v){ 
      // Start of with the status of the transaction line as true (it is a good transaction line)
      // tidy up vat lines
      delete v.StockItemDescription;
      // Set the StockItemPrice (the LineAmount) to be the TaxAmount
      // as this is actually a VAT Line
      // toFixed returns a string - and we need a string to compare numbers
      v.TaxAmount = parseFloat(v.StockItemPrice).toFixed(4);
      v.VatGLAccountCode = v.GLAccountCode;
      delete v.StockItemPrice;
      delete v.GLAccountCode;
      v.ExpectedNetAmount = (v.TaxAmount * 5).toFixed(2)/1;
    });
    if ( invoice.lines.length != 0 ) {
      // Set up the header amounts - they will be added to as we loop through lines ...
      invoice.ExchangeRate = 1;
      invoice.NetAmount = 0;
      invoice.GrossAmount = 0;
      invoice.TaxAmount = 0;
      // Format the dates (can't do in safeEval and they are wrong!) 
      invoice.InvoiceDate = formatDate(invoice.InvoiceDate);
      invoice.OrderDate = formatDate(invoice.OrderDate);
      // now we have a series of lines in an array ... 
      // some will have VAT amounts and some have net amounts
      // VAT amounts have "VAT" in the StockItemDescription
      // And in most cases that has a matching entry in the array 
      // The match will be for the Net Amount which will be 5 x as much
      // Need to find a match and add the amount as VatAmount TaxAmount
      // Must then get the appropriate VAT rate code to add to TaxCode
      // and calculate the TaxRate
      // Due to rounding on VAT amounts - need to actually test non vat lines!
      
      // Using GL code
      //  When GlCode is 9999 - 20% VAT, 9998 - 4% VAT
      invoice.lines.forEach(function(line) {
        line.TaxMatched = false; // mark the line as NOT matched - will set to true as we find a match
        //line.isCorrect = { "status": false }; // assume the line is not correct as have no VAT!
        // See if I have a discount line that has parent id matching 
        // my Reservedresourceid which is now called ReservedResourceID
        var isMatchDiscount =  _.filter(discountLines, { ParentID : line.ReservedResourceID });
        if (isMatchDiscount.length === 1) {
          console.log('DISCOUNT MATCH FOR ' + line.StockItemPrice + ':' + JSON.stringify(isMatchDiscount));
          console.log('isMatch Amount ' + isMatchDiscount[0].DiscountAmount);
          console.log('isMatch Line Note ' + isMatchDiscount[0].Notes);
          line.DiscountRate = isMatchDiscount[0].DiscountAmount / line.StockItemPrice;
          // Remove the applied discount line from the discountLines array (should end up with none at the end!) - is only one so just do ..
          _.remove(discountLines, isMatchDiscount[0] );
          // Need to update the VAT line ExpectedNetAmount as we have reduced
          // the line value
        }
        else { // no dodgy discounts
          line.DiscountRate = 0;
        }
        // Build in the discount
        // ActualPrice aka DiscountPrice
        line.ActualPrice = (line.StockItemPrice * (1 - line.DiscountRate));
        // Have to set the invoiced quantity now to 1 (can't default later) as needed to calculate tax and discounts ...
        line.InvoicedQuantity = 1;
        line.NetAmount = (line.ActualPrice * line.InvoicedQuantity);
        // Round the net amount off and convert to string for comparison
        line.NetAmount = line.NetAmount.toFixed(4)/1;
        // Now loop through and try to match up VAT amouonts to Lines
        // On a match remove from the lines
        // On duplicate raise an error
        // On no match raise error (may be non VAT invoice)
        // START Check VAT
        // first pass - do it without the parent/reserved resource id - picks up a lot of the accumulated VAT amounts (and single line rents ..)
        var isMatchWithParent =  _.filter(vatLines, { "ExpectedNetAmount" : line.NetAmount, "ParentID" :  line.ReservedResourceID });
        if (isMatchWithParent.length === 1) {
          console.log(' WE HAVE A MATCH FOR 20% VAT ' + line.NetAmount + ':' + JSON.stringify(isMatchWithParent));
          console.log('isMatchWithParent Tax Amount ' + isMatchWithParent[0].TaxAmount);
          console.log('isMatch GL Code ' + isMatchWithParent[0].VatGLAccountCode);
          line.TaxAmount = isMatchWithParent[0].TaxAmount;
          line.TaxMatched = true; // mark the line as matched 
          // Now try to remove the matched element from the vatLines array
          _.remove(vatLines, isMatchWithParent[0] );
          console.log('VAT LINES IS NOW ' + JSON.stringify(vatLines));
        } else if (isMatchWithParent.length === 0) {
          var isMatchNoParent =  _.filter(vatLines, { "ExpectedNetAmount" : line.NetAmount });
          if (isMatchNoParent.length === 1) {
            console.log(' WE HAVE A MATCH FOR 20% VAT ' + line.NetAmount + ':' + JSON.stringify(isMatchNoParent));
            console.log('isMatchNoParent Tax Amount ' + isMatchNoParent[0].TaxAmount);
            console.log('isMatchNoParent GL Code ' + isMatchNoParent[0].VatGLAccountCode);
            line.TaxAmount = isMatchNoParent[0].TaxAmount;
            line.TaxMatched = true; // mark the line as matched 
            // Now try to remove the matched element from the vatLines array
            _.remove(vatLines, isMatchNoParent[0] );
            console.log('VAT LINES IS NOW ' + JSON.stringify(vatLines));
          } else if (isMatchNoParent.length === 0) {
            //console.log(' WE DO NOT HAVE A MATCH FOR ' + line.NetAmount );
            // So we did not find an exact match based on the amount
            // 4 possible cases where this occured 
            // 1. The recurring 3´s ... where a line amount is something .6666
            // the NetAmount becomes x.67 - and the Tax amount is y.33
            // when we multiply that by 5 to see what the ExpectedNetAmount is
            // it becomes x.65 and as x.65 does not equal x.67 we fail to match
            // SO ADD 2p and try again! 
            // Eventually just match to +/- 2p
            var RecurringAmountMissed1 = (line.NetAmount + 0.02).toFixed(2)/1;
            var RecurringAmountMissed2 = (line.NetAmount + 0.01).toFixed(2)/1;
            var RecurringAmountMissedm1 = (line.NetAmount - 0.01).toFixed(2)/1;
            var RecurringAmountMissedm2 = (line.NetAmount - 0.02).toFixed(2)/1;
            console.log('Check if ROUNDING' ); 
            var isMatchMissed =  _.filter(vatLines, function(vatLine) { 
              return vatLine.ExpectedNetAmount === RecurringAmountMissed1 || 
              vatLine.ExpectedNetAmount === RecurringAmountMissed2  ||
              vatLine.ExpectedNetAmount === RecurringAmountMissedm1  ||
              vatLine.ExpectedNetAmount === RecurringAmountMissedm2 ;
            });
            if (isMatchMissed.length === 1) {
              console.log('Found with ROUNDING' + JSON.stringify(isMatchMissed) ); 
              line.TaxAmount = isMatchMissed[0].TaxAmount;
              line.isWarning = { 'check': true, 'reason':'Matched VAT Found on Rounding Error' }
              line.TaxMatched = true; // mark the line as matched 
              // Now try to remove the matched element from the vatLines array
              _.remove(vatLines, isMatchMissed[0] );
            } else if (line.GLAccountCode == "4004" && line.DiscountRate > 0 ) {
              // 2. A discount was applied. the match on StockItemPrice
              // to the tax line "ExpectedNetAmount" fails due discount
              // line.NetAmount may fail to match due to rounding errors
              // But in that case we should have;
              // a line.GLAccountCode = 4004, and line.ReservedResourceID = the tax lines
              // ParentID, and we should be correct to 1 decimal place
              isMatchVATWithDiscount = _.filter(vatLines, { ParentID : line.ReservedResourceID });
              if (isMatchVATWithDiscount.length === 1) {
                console.log('Looks like we have a discount line VAT match missed on rounding ... ');
                var myTempNetAmount = line.NetAmount;
                if ( myTempNetAmount.toFixed(1) == isMatchVATWithDiscount[0].ExpectedNetAmount.toFixed(1) ) {
                  // Looks like the line meets the rules for dodgy discount!
                  line.TaxAmount = isMatchVATWithDiscount[0].TaxAmount;
                  line.TaxMatched = true; // mark the line as matched 
                  line.isWarning = { 'check': true, 'reason':'Manual Check Advised before Posting. VAT should be checked as match was applied without rounding due to a discount being applied' }
                  _.remove(vatLines, isMatchVATWithDiscount[0] );
                }
              }
            } else if ( line.GLAccountCode == "4004" ) {
              // Now the nasty one! This is where the VAT is split between rates
              // Only occurs on Rent (so 4004 GL Cod e - if so can add that to message
              if ( vatLines.length === 1 ) { 
                line.updateStatus = { 'status': "danger", 'error':'Split Rate VAT - Please enter the invoice manually. One VAT Amount for ' + vatLines[0].TaxAmount + ' found. If all 20% should have been ' + (line.NetAmount * 0.2) };
              } else {
                line.updateStatus = { 'status': "danger", 'error':'Split Rate VAT - Please enter the invoice manually' };
              }
            } 
          } else {
            //console.log(' WE HAVE A SERIOUS ISSUE - MATCHED MORE THAN ONE LINE: ' + isMatch.length + ' LINES FOUND');
            line.updateStatus = { 'status': "danger", 'error':'Multiple VAT Found' }
          }
        }
      });
      //vatLines.forEach(function(line) {
      if ( vatLines.length > 0 ) { // we still have vatLines to match
        // Should only be remaining lines that have not already been matched off ...
        var unmatchedLines = _.filter(invoice.lines, { "TaxMatched": false });
        console.log('UNMATCHED VATLINES ' + invoice.ExternalReference + ' ' + unmatchedLines.length);
        var unmatchedTaxValues = _.round(_.multiply(_.sumBy(unmatchedLines, 'NetAmount'),0.2),2);
        var vatLinesTaxValues = _.round(_.sumBy(vatLines, 'TaxAmount'),2);
        console.log('UNMATCHED VATLINES VALUES ' + unmatchedTaxValues);
        console.log('UNMATCHED VATLINES ' + vatLinesTaxValues);
        console.log('UNMATCHED VATLINES ' + JSON.stringify(vatLines));
        // Simple quick check - if the unmatchedTaxValues equals the vatLinesTaxValues then we have tax lines which matches all of the unmatched tax amounts - so we just set the invoices.lines.TaxAmount = invoice.line.NetAmount * 0.2
        if ( unmatchedTaxValues == vatLinesTaxValues ) {
          //_.filter(invoice.lines, { "TaxMatched": false });
          invoice.lines.forEach(function(invline) {
            if ( invline.TaxMatched == false ) {
              console.log('UNMATCHED VATLINES UPDATING VAT ' + invoice.ExternalReference);
              invline.TaxAmount = parseFloat(invline.NetAmount).toFixed(2) * 0.2;
              invline.TaxMatched = true;
            }
          });
        }
      }
      //});
      invoice.lines.forEach(function(line) {
        // Check VAT - if got through that with no TaxAmount raise error
        if ( ! line.TaxAmount || line.TaxAmount == 0 || line.TaxAmount == '' ) {
          // and there is no error already! 
          if ( ! line.updateStatus ) {
            line.updateStatus = { 'status': "danger", 'error':'No VAT Found' };
          }
        }
        // reduce the amounts to two decimals 
        // hack to get make tax amount a number
        // toFixed returns a string (needed above to compare) - so need 
        // to mess about a lot to get numbers back! 
        var tempTaxAmount = (line.TaxAmount * 1);	
        line.TaxAmount = (tempTaxAmount.toFixed(2)/1);
        var tempDiscountRate = (line.DiscountRate * 1);	
        line.DiscountRate = (tempDiscountRate.toFixed(2)/1);
        var tempActualPrice = (line.ActualPrice * 1);	
        line.ActualPrice = (tempActualPrice.toFixed(2)/1);
        line.TaxRate = (line.TaxAmount / line.ActualPrice); 
        var tempTaxRate = (line.TaxRate * 1);	
        line.TaxRate = (tempTaxRate.toFixed(2)/1);
        sumTaxAmount += line.TaxAmount
        sumNetAmount += line.NetAmount
        // Tax Amount is already on the line
        // line.TaxAmount = 
        // So calculate the Tax Rate (line.TaxAmount / line.ActualPrice 
        line.GrossAmount = (1 * line.NetAmount + line.TaxAmount);
        sumGrossAmount += line.GrossAmount
        line.InvoiceItemID = 0;
        // Delete temp values that not needed for invoice Lines
        delete line.ParentID;
        delete line.ReservedResourceID;
        //line.StockItemDescription = 'From Default';
        // Calculate the sum of the net and Tax and Gross Amoubts
        invoice.NetAmount += line.NetAmount.toFixed(2)/1;
        invoice.GrossAmount += line.GrossAmount.toFixed(2)/1;
        invoice.TaxAmount += line.TaxAmount.toFixed(2)/1;
      });
      // Round off the header values
      var tempNetAmount = (invoice.NetAmount * 1);	
      invoice.NetAmount = (tempNetAmount.toFixed(2)/1);     
      var tempGrossAmount = (invoice.GrossAmount * 1);	
      invoice.GrossAmount = (tempGrossAmount.toFixed(2)/1);     
      var tempTaxAmount = (invoice.TaxAmount * 1);	
      invoice.TaxAmount = (tempTaxAmount.toFixed(2)/1);     
      // Mandatory Dates
      today = new Date();
      invoice.CreationDate = today.toISOString().slice(0,10);
      invoice.DeliveryDate = today.toISOString().slice(0,10);
      // Set the updateStatus for the invoice - need function as simple uniqBy goes wrong if line updateStatus is null
      invoice.updateStatus = _.uniqBy(_.map(invoice.lines, function(line) { 
        if ( typeof line.updateStatus !== 'undefined' ) {
          console.log('UPDATESTATUS is defined');
          if ( line.updateStatus.status == 'warning' || line.updateStatus.status == 'danger' ) {
            console.log('UPDATESTATUS is warning or danger ');
            return line.updateStatus;
          }
        }
      }));
    } else { // invoice has no lines - mark as error
      invoice.updateStatus = { 'status': "warning", 'error':'No non zero amount lines found' };
    } // end if invoice.lines.length = 0
    console.log(invoice.ExternalReference + ' DISCOUNT AFTER LINES LENGTH ' + discountLines.length);
    //console.log(invoice.ExternalReference + ' STD VAT AFTER LINES LENGTH ' + vatStdLines.length);
    //console.log(invoice.ExternalReference + ' REDUCED AFTER VAT LINES LENGTH ' + vatReducedLines.length);
    console.log(invoice.ExternalReference + ' ALL VAT AFTER LINES LENGTH ' + vatLines.length);
    console.log(invoice.updateStatus + ' IS MY UPDATESTATUS');
    // check to see if any lines are incorrect - if any staus is false	
    console.log('Push invoice :' + JSON.stringify(invoice));
    console.log('Push reference :' + invoice.ExternalReference);
    feedTransactionArray.push(invoice);
  }) // end loop through unique external ref's
  return feedTransactionArray;
},
processData.prototype.CorlessAdjustments = function(feedTransactions, opts, options, cb) {
  console.log('Running Process Data');
  // Arrays to store data
  var feedTransactionArray = [];

  // Sanity Check Variables
  // Count of invoice lines and invoices, sum of NetAmount, TaxAmount and GrossAmount
  // variables
  console.log('reset the control totals');
  var countInvoiceLines = 0;
  var countInvoices = 0;
  var sumNetAmount = 0;
  var sumTaxAmount = 0;
  var sumGrossAmount = 0;
  // The header for epic defined by the date and the ExtRef column 
  console.log(JSON.stringify(feedTransactions));
  headerValues = _.filter(opts.clientSettings.headerValues, { "supplied" : true });
  lineValue = _.filter(opts.clientSettings.lineValues, { "supplied" : true });
  // first - "pick" out the ExtRef and the date field from the array  
  headers = _.map(feedTransactions, _.partialRight(_.pick, 'ReservationNumber' ));
  // then by a bit of magic (not sure how!) we convert that to a unique array by ExtRef and Invoice Date
  //uniqueHeaders = _.map( _.uniq( _.map(uniqueHeaders, function(obj){ return JSON.stringify(obj); })), function(obj) { return JSON.parse(obj); });
  uniqueHeaders = _.uniqBy(headers, 'ReservationNumber');
  console.log('HEADERS ' + JSON.stringify(uniqueHeaders));
  uniqueHeaders.forEach(function(header) {
    invLines = _.filter(feedTransactions, header);
    // Construct an invoice header
    var header = invLines[0];
    invoice = {};
    headerValues.forEach(function(myValue) {
      //console.log('Evaluate ' + myValue.name + ' ' + myValue.value);
      invoice[myValue.name] = safeEval(myValue.value, {header : header})
    });
    console.log('header is ' + JSON.stringify(invoice));
    invoice.lines = [];
    invLines.forEach(function(line) {
      var aiqLine = {}; // empty the line that we are to construct
      // the conf file should say if it is a line value ...
      console.log('line is ' + JSON.stringify(line));
      lineValue.forEach(function(myValue) {
        //console.log('Evaluate ' + myValue.name + ' ' + myValue.value);
        aiqLine[myValue.name] = safeEval(myValue.value, {line : line})
      });
      console.log(JSON.stringify(aiqLine));
      // Push the line formatted for aiq into the invoice ...
      // Exclude lines where the StockItemPrice is 0 - we can get them ...
      if ( aiqLine.StockItemPrice != 0 ) {
        aiqLine.StockItemPrice = parseFloat(aiqLine.StockItemPrice).toFixed(2);
        invoice.lines.push(aiqLine);
      }
    });
    console.log('Before discount check lines are ' + JSON.stringify(invoice.lines));
    var discountLines = _.filter(invoice.lines, { "GLAccountCode" : ""  });
    console.log(invoice.ExternalReference + ' DISCOUNT LINES LENGTH ' + discountLines.length);
    var vatStdLines = _.filter(invoice.lines, { "GLAccountCode" : '9999' });
    //console.log(invoice.ExternalReference + ' STD VAT LINES LENGTH ' + vatStdLines.length);
    var vatReducedLines = _.filter(invoice.lines, { "GLAccountCode" : '9998' });
    //console.log(invoice.ExternalReference + ' REDUCED VAT LINES LENGTH ' + vatReducedLines.length);
    var vatLines = _.merge(vatStdLines, vatReducedLines);
    console.log(invoice.ExternalReference + ' ALL VAT LINES LENGTH ' + vatLines.length);
    // Remove the discount, vat (both types) from the invLines array
    _.remove(invoice.lines, { "GLAccountCode" : ''  })
    _.remove(invoice.lines, { "GLAccountCode" : '9999'  });
    _.remove(invoice.lines, { "GLAccountCode" : '9998'  });
    discountLines.forEach(function(v){ 
      // Will need to convert the Amount to a Rate when we match it to a line
      v.DiscountAmount = ( -1 * v.StockItemPrice );
      v.Notes = v.StockItemDescription;
      delete v.GLAccountCode; 
      delete v.StockItemDescription;
      delete v.ReservedResourceID;
    });
    console.log(invoice.ExternalReference + ' has Discount lines ' + JSON.stringify(discountLines));
    vatLines.forEach(function(v){ 
      // Start of with the status of the transaction line as true (it is a good transaction line)
      // tidy up vat lines
      delete v.StockItemDescription;
      // Set the StockItemPrice (the LineAmount) to be the TaxAmount
      // as this is actually a VAT Line
      // toFixed returns a string - and we need a string to compare numbers
      v.TaxAmount = parseFloat(v.StockItemPrice).toFixed(4);
      v.VatGLAccountCode = v.GLAccountCode;
      delete v.StockItemPrice;
      delete v.GLAccountCode;
      v.ExpectedNetAmount = (v.TaxAmount * 5).toFixed(2)/1;
    });
    if ( invoice.lines.length != 0 ) {
      // Set up the header amounts - they will be added to as we loop through lines ...
      invoice.ExchangeRate = 1;
      invoice.NetAmount = 0;
      invoice.GrossAmount = 0;
      invoice.TaxAmount = 0;
      // Format the dates (can't do in safeEval and they are wrong!) 
      invoice.InvoiceDate = formatDate(invoice.InvoiceDate);
      invoice.OrderDate = formatDate(invoice.OrderDate);

      // now we have a series of lines in an array ... 
      // some will have VAT amounts and some have net amounts
      // VAT amounts have "VAT" in the StockItemDescription
      // And in most cases that has a matching entry in the array 
      // The match will be for the Net Amount which will be 5 x as much
      // Need to find a match and add the amount as VatAmount TaxAmount
      // Must then get the appropriate VAT rate code to add to TaxCode
      // and calculate the TaxRate
      // Due to rounding on VAT amounts - need to actually test non vat lines!
        
      // Using GL code
      //  When GlCode is 9999 - 20% VAT, 9998 - 4% VAT
      invoice.lines.forEach(function(line) {

        line.TaxMatched = false; // mark the line as NOT matched - will set to true as we find a match
        //line.isCorrect = { "status": false }; // assume the line is not correct as have no VAT!
        // See if I have a discount line that has parent id matching 
        // my Reservedresourceid which is now called ReservedResourceID
        var isMatchDiscount =  _.filter(discountLines, { ParentID : line.ReservedResourceID });
        if (isMatchDiscount.length === 1) {
          console.log('DISCOUNT MATCH FOR ' + line.StockItemPrice + ':' + JSON.stringify(isMatchDiscount));
          console.log('isMatch Amount ' + isMatchDiscount[0].DiscountAmount);
          console.log('isMatch Line Note ' + isMatchDiscount[0].Notes);
          line.DiscountRate = isMatchDiscount[0].DiscountAmount / line.StockItemPrice;
          // Remove the applied discount line from the discountLines array (should end up with none at the end!) - is only one so just do ..
          _.remove(discountLines, isMatchDiscount[0] );
          // Need to update the VAT line ExpectedNetAmount as we have reduced
          // the line value
        }
        else { // no dodgy discounts
          line.DiscountRate = 0;
        }
        // Build in the discount
        // ActualPrice aka DiscountPrice
        line.ActualPrice = (line.StockItemPrice * (1 - line.DiscountRate));
        // Have to set the invoiced quantity now to 1 (can't default later) as needed to calculate tax and discounts ...
        line.InvoicedQuantity = 1;
        line.NetAmount = (line.ActualPrice * line.InvoicedQuantity);
        // Round the net amount off and convert to string for comparison
        line.NetAmount = line.NetAmount.toFixed(4)/1;
        // Now loop through and try to match up VAT amouonts to Lines
        // On a match remove from the lines
        // On duplicate raise an error
        // On no match raise error (may be non VAT invoice)
        // START Check VAT
        // first pass - do it without the parent/reserved resource id - picks up a lot of the accumulated VAT amounts (and single line rents ..)
        var isMatchWithParent =  _.filter(vatLines, { "ExpectedNetAmount" : line.NetAmount, "ParentID" :  line.ReservedResourceID });
        if (isMatchWithParent.length === 1) {
          console.log(' WE HAVE A MATCH FOR 20% VAT ' + line.NetAmount + ':' + JSON.stringify(isMatchWithParent));
          console.log('isMatchWithParent Tax Amount ' + isMatchWithParent[0].TaxAmount);
          console.log('isMatch GL Code ' + isMatchWithParent[0].VatGLAccountCode);
          line.TaxAmount = isMatchWithParent[0].TaxAmount;
          line.TaxMatched = true; // mark the line as matched 
          // Now try to remove the matched element from the vatLines array
          _.remove(vatLines, isMatchWithParent[0] );
          console.log('VAT LINES IS NOW ' + JSON.stringify(vatLines));
        } else if (isMatchWithParent.length === 0) {
          var isMatchNoParent =  _.filter(vatLines, { "ExpectedNetAmount" : line.NetAmount });
          if (isMatchNoParent.length === 1) {
            console.log(' WE HAVE A MATCH FOR 20% VAT ' + line.NetAmount + ':' + JSON.stringify(isMatchNoParent));
            console.log('isMatchNoParent Tax Amount ' + isMatchNoParent[0].TaxAmount);
            console.log('isMatchNoParent GL Code ' + isMatchNoParent[0].VatGLAccountCode);
            line.TaxAmount = isMatchNoParent[0].TaxAmount;
            line.TaxMatched = true; // mark the line as matched 
            // Now try to remove the matched element from the vatLines array
            _.remove(vatLines, isMatchNoParent[0] );
            console.log('VAT LINES IS NOW ' + JSON.stringify(vatLines));
          } else if (isMatchNoParent.length === 0) {
            //console.log(' WE DO NOT HAVE A MATCH FOR ' + line.NetAmount );
            // So we did not find an exact match based on the amount
            // 4 possible cases where this occured 
            // 1. The recurring 3´s ... where a line amount is something .6666
            // the NetAmount becomes x.67 - and the Tax amount is y.33
            // when we multiply that by 5 to see what the ExpectedNetAmount is
            // it becomes x.65 and as x.65 does not equal x.67 we fail to match
            // SO ADD 2p and try again! 
            // Eventually just match to +/- 2p
            var RecurringAmountMissed1 = (line.NetAmount + 0.02).toFixed(2)/1;
            var RecurringAmountMissed2 = (line.NetAmount + 0.01).toFixed(2)/1;
            var RecurringAmountMissedm1 = (line.NetAmount - 0.01).toFixed(2)/1;
            var RecurringAmountMissedm2 = (line.NetAmount - 0.02).toFixed(2)/1;
            console.log('Check if ROUNDING' ); 
            var isMatchMissed =  _.filter(vatLines, function(vatLine) { 
              return vatLine.ExpectedNetAmount === RecurringAmountMissed1 || 
              vatLine.ExpectedNetAmount === RecurringAmountMissed2  ||
              vatLine.ExpectedNetAmount === RecurringAmountMissedm1  ||
              vatLine.ExpectedNetAmount === RecurringAmountMissedm2 ;
            });
            if (isMatchMissed.length === 1) {
              console.log('Found with ROUNDING' + JSON.stringify(isMatchMissed) ); 
              line.TaxAmount = isMatchMissed[0].TaxAmount;
              line.isWarning = { 'check': true, 'reason':'Matched VAT Found on Rounding Error' }
              line.TaxMatched = true; // mark the line as matched 
              // Now try to remove the matched element from the vatLines array
              _.remove(vatLines, isMatchMissed[0] );
            } else if (line.GLAccountCode == "4004" && line.DiscountRate > 0 ) {
              // 2. A discount was applied. the match on StockItemPrice
              // to the tax line "ExpectedNetAmount" fails due discount
              // line.NetAmount may fail to match due to rounding errors
              // But in that case we should have;
              // a line.GLAccountCode = 4004, and line.ReservedResourceID = the tax lines
              // ParentID, and we should be correct to 1 decimal place
              isMatchVATWithDiscount = _.filter(vatLines, { ParentID : line.ReservedResourceID });
              if (isMatchVATWithDiscount.length === 1) {
                console.log('Looks like we have a discount line VAT match missed on rounding ... ');
                var myTempNetAmount = line.NetAmount;
                if ( myTempNetAmount.toFixed(1) == isMatchVATWithDiscount[0].ExpectedNetAmount.toFixed(1) ) {
                  // Looks like the line meets the rules for dodgy discount!
                  line.TaxAmount = isMatchVATWithDiscount[0].TaxAmount;
                  line.TaxMatched = true; // mark the line as matched 
                  line.isWarning = { 'check': true, 'reason':'Manual Check Advised before Posting. VAT should be checked as match was applied without rounding due to a discount being applied' }
                  _.remove(vatLines, isMatchVATWithDiscount[0] );
                }
              }
            } else if ( line.GLAccountCode == "4004" ) {
              // Now the nasty one! This is where the VAT is split between rates
              // Only occurs on Rent (so 4004 GL Cod e - if so can add that to message
              if ( vatLines.length === 1 ) { 
                line.updateStatus = { 'status': "danger", 'error':'Split Rate VAT - Please enter the invoice manually. One VAT Amount for ' + vatLines[0].TaxAmount + ' found. If all 20% should have been ' + (line.NetAmount * 0.2) };
              } else {
                line.updateStatus = { 'status': "danger", 'error':'Split Rate VAT - Please enter the invoice manually' };
              }
            } 
          } else {
            //console.log(' WE HAVE A SERIOUS ISSUE - MATCHED MORE THAN ONE LINE: ' + isMatch.length + ' LINES FOUND');
            line.updateStatus = { 'status': "danger", 'error':'Multiple VAT Found' }
          }
        }
      });
      //vatLines.forEach(function(line) {
      if ( vatLines.length > 0 ) { // we still have vatLines to match
        // Should only be remaining lines that have not already been matched off ...
        var unmatchedLines = _.filter(invoice.lines, { "TaxMatched": false });
        console.log('UNMATCHED VATLINES ' + invoice.ExternalReference + ' ' + unmatchedLines.length);
        var unmatchedTaxValues = _.round(_.multiply(_.sumBy(unmatchedLines, 'NetAmount'),0.2),2);
        var vatLinesTaxValues = _.round(_.sumBy(vatLines, 'TaxAmount'),2);
        console.log('UNMATCHED VATLINES VALUES ' + unmatchedTaxValues);
        console.log('UNMATCHED VATLINES ' + vatLinesTaxValues);
        console.log('UNMATCHED VATLINES ' + JSON.stringify(vatLines));
        // Simple quick check - if the unmatchedTaxValues equals the vatLinesTaxValues then we have tax lines which matches all of the unmatched tax amounts - so we just set the invoices.lines.TaxAmount = invoice.line.NetAmount * 0.2
        if ( unmatchedTaxValues == vatLinesTaxValues ) {
          //_.filter(invoice.lines, { "TaxMatched": false });
          invoice.lines.forEach(function(invline) {
            if ( invline.TaxMatched == false ) {
              console.log('UNMATCHED VATLINES UPDATING VAT ' + invoice.ExternalReference);
              invline.TaxAmount = parseFloat(invline.NetAmount).toFixed(2) * 0.2;
              invline.TaxMatched = true;
            }
          });
        }
      }
      //});
      // AMMENDMENTS - change from invoices 
      // If we have no VAT lines, and the NetAmount totals to zero then we are to drop the transaction (as it is not needed in AIQ as per client instruction - it is a change of booking with no charge so not required ...
      totalNetAmount = _.sumBy(invoice.lines, 'NetAmount');
      console.log(invoice.ExternalReference + ' has SUM NETAMOUNT IS ' + totalNetAmount + ' linecount ' +  invoice.lines.length)
      if ( totalNetAmount == 0) {
        invoice.updateStatus = { 'status': "warning", 'error':'Invoice Totals to Zero' };
        console.log('DROP SUM NET AMOUNT  AND NOT VAT ON ' + invoice.ExtRef);
        invoice.updateStatus = { 'status': "warning", 'error': 'Not processing as no VAT and line amounts total 0' };
        invoice.lines.forEach(function(v) {
          // Adjustments - getting a lot with no tax amount so default to zero
          console.log(JSON.stringify(v));
          v.TaxAmount = 0;
          v.TaxRate = 0;
          v.updateStatus = { 'status': "danger", 'error':'Invoice Totals to Zero' };
          console.log(JSON.stringify(v));
        });
      } else { // total amount is not zero ...
        invoice.lines.forEach(function(line) {
          // Check VAT - if got through that with no TaxAmount raise error
          if ( ! line.TaxAmount || line.TaxAmount == 0 || line.TaxAmount == '' ) {
            // and there is no error already! 
            if ( ! line.updateStatus ) {
              line.updateStatus = { 'status': "warning", 'error':'No VAT Found' };
            }
          }
          // reduce the amounts to two decimals 
          // hack to get make tax amount a number
          // toFixed returns a string (needed above to compare) - so need 
          // to mess about a lot to get numbers back! 
          var tempTaxAmount = (line.TaxAmount * 1);	
          line.TaxAmount = (tempTaxAmount.toFixed(2)/1);
          var tempDiscountRate = (line.DiscountRate * 1);	
          line.DiscountRate = (tempDiscountRate.toFixed(2)/1);
          var tempActualPrice = (line.ActualPrice * 1);	
          line.ActualPrice = (tempActualPrice.toFixed(2)/1);
          line.TaxRate = (line.TaxAmount / line.ActualPrice); 
          var tempTaxRate = (line.TaxRate * 1);	
          line.TaxRate = (tempTaxRate.toFixed(2)/1);
          sumTaxAmount += line.TaxAmount
          sumNetAmount += line.NetAmount
          // Tax Amount is already on the line
          // line.TaxAmount = 
          // So calculate the Tax Rate (line.TaxAmount / line.ActualPrice 
          line.GrossAmount = (1 * line.NetAmount + line.TaxAmount);
          sumGrossAmount += line.GrossAmount
          line.InvoiceItemID = 0;
          // Delete temp values that not needed for invoice Lines
          delete line.ParentID;
          delete line.ReservedResourceID;
          //line.StockItemDescription = 'From Default';
          // Calculate the sum of the net and Tax and Gross Amoubts
          invoice.NetAmount += line.NetAmount.toFixed(2)/1;
          invoice.GrossAmount += line.GrossAmount.toFixed(2)/1;
          invoice.TaxAmount += line.TaxAmount.toFixed(2)/1;
        // Round off the header values
        });
        var tempNetAmount = (invoice.NetAmount * 1);	
        invoice.NetAmount = (tempNetAmount.toFixed(2)/1);     
        var tempGrossAmount = (invoice.GrossAmount * 1);	
        invoice.GrossAmount = (tempGrossAmount.toFixed(2)/1);     
        var tempTaxAmount = (invoice.TaxAmount * 1);	
        invoice.TaxAmount = (tempTaxAmount.toFixed(2)/1);     
        // Mandatory Dates
        today = new Date();
        invoice.CreationDate = today.toISOString().slice(0,10);
        invoice.DeliveryDate = today.toISOString().slice(0,10);
        console.log(JSON.stringify(invoice.updateStatus) + ' WAS MY UPDATESTATUS');
        // Set the updateStatus for the invoice - need function as simple uniqBy goes wrong if line updateStatus is null
        invoice.updateStatus = _.uniqBy(_.map(invoice.lines, function(line) { 
          if ( typeof line.updateStatus !== 'undefined' ) {
            console.log('UPDATESTATUS is defined');
            if ( line.updateStatus.status == 'warning' || line.updateStatus.status == 'danger' ) {
              console.log('UPDATESTATUS is warning or danger ');
              return line.updateStatus;
            }
          }
        }));
      } // end the if total amount is zero
    } else { // invoice has no lines - mark as error
      invoice.updateStatus = { 'status': "danger", 'error':'No non zero amount lines found' };
    } // end if invoice.lines.length = 0
    console.log(invoice.ExternalReference + ' DISCOUNT AFTER LINES LENGTH ' + discountLines.length);
    //console.log(invoice.ExternalReference + ' STD VAT AFTER LINES LENGTH ' + vatStdLines.length);
    //console.log(invoice.ExternalReference + ' REDUCED AFTER VAT LINES LENGTH ' + vatReducedLines.length);
    console.log(invoice.ExternalReference + ' ALL VAT AFTER LINES LENGTH ' + vatLines.length);
    console.log(JSON.stringify(invoice.updateStatus) + ' IS MY UPDATESTATUS');
    // Bar Sales - product codes come in as UPTA_??? 
    // We need to change the product code to UPTA 
    _.map(invoice.lines, function(obj){
      if(obj.StockItemID.includes('UPTA_')) {
        // Bar Sales act differently - we are not expecting a VAT line if the product code (StockItemID upta_barsales_0)
        if (obj.StockItemID == 'UPTA_BARSALES_0' ) {
          // "updateStatus":{"status":"warning","error":"No VAT Found"},"TaxAmount":null,"TaxRate":null,"GrossAmount":null
          //if (obj.TaxAmount == null && obj.TaxRate == null && obj.updateStatus.status == 'warning' && obj.updateStatus.error == "No VAT Found" ) {
          if (obj.updateStatus.status == 'warning' && obj.updateStatus.error == "No VAT Found" ) {
            console.log('BAR SALES 0 VAT LINE - ' + JSON.stringify(obj));
            obj.TaxAmount = 0;
            obj.TaxRate = 0;
            obj.GrossAmount = obj.NetAmount + obj.TaxAmount;
            obj.updateStatus = {};
            console.log('BAR SALES 0 VAT LINE - ' + JSON.stringify(obj));
          }
        }
        obj.StockItemID='UPTA';
      }
    });
    console.log('Push invoice :' + JSON.stringify(invoice));
    console.log('Push reference :' + invoice.ExternalReference);
    feedTransactionArray.push(invoice);
  }) // end loop through unique external ref's
  return feedTransactionArray;
}
/*
processData.prototype.CorlessAdjustments = function(feedTransactions, opts, options, cb) {
    console.log('Running Process Data');
    // Arrays to store data
    var arrayInvoice = [];
    var arrayInvoiceIdentifier = [];
    var uniqueInvoices = [];

    // Sanity Check Variables
    // Count of invoice lines and invoices, sum of NetAmount, TaxAmount and GrossAmount
    // variables
    console.log('reset the control totals');
    var countInvoiceLines = 0;
    var countInvoices = 0;
    var sumNetAmount = 0;
    var sumTaxAmount = 0;
    var sumGrossAmount = 0;
    feedTransactions.forEach(function(res) {
      // Format Dates
      var InvoiceDate = formatDate(res.ReservationDate);
      var OrderDate = formatDate(res.StartDate);
      // Create an array of all records called "InvoiceLines" and push in
      // the required fields
      // if VALUE exists use it
      // also set rounding to two decimal places
      //var Newprice = Number(res.Newprice);
      //var Totalinternalprice = Number(res.Totalinternalprice.replace(/[^0-9\.]+/g,""));
      var Totalinternalprice = Number(res.TotalInternalPrice);
      var Price;
      // there is no "Newprice" in Adjustments - just use the Totalinternalprice
      Price = Totalinternalprice;
      // however adjustments can be negative (Sales Credit)
      // in fact an invoice (from feeder system) can have both invoice and credit lines
      // but the seperation into invoices and credits will be done on the update
      if ( Price < 0 ) {
        res.TransactionType = "SC";
      } else {
        res.TransactionType = "SI";
      }
      console.log('ExtRef ' + res.ReservationNumber + ' has price ' + Price);
      console.log('ExtRef ' + res.ReservationNumber + ' has price ' + Price);
      // Now drop off lines where the Price is zero
      // Also add Expected Tax (VAT) Amount at 20% VAT 
      // Dccode - the customer code - convert to uppercase ..
      if ( Price !== 0 ) {
	// use a default product code
        arrayInvoice.push({'TransactionType' : res.TransactionType, 'GLAccountCode' : res.GLCODE, 'ExternalReference' : res.ReservationNumber , 'InvoiceDate' : InvoiceDate , 'OrderDate' : OrderDate , 'CustomerCode' : res.DcCode.toUpperCase(), 'StockItemDescription':  res.GuestName + ':' + res.ProductName + ':' + res.BookingReferenc + ':' + res.StartDate + ':' + res.EndDate , 'DepartmentID' : res.ResortCode, 'StockItemPrice' : Price, 'StockItemID': res.ProductCode.toUpperCase() });
      } 
      //console.log(JSON.stringify(arrayInvoice));
      // Create array invoices - to hold the value in the source data that
      // identifies unique invoices (ExternalReference). Use this to loop 
      // through invoice and create invoice objects (with lines as array)
      arrayInvoiceIdentifier.push(res.ReservationNumber);
    })

    // Once the list of invoice numbers is complete - sort it to a unique array
    uniqueInvoices = arrayInvoiceIdentifier.filter(function(elem, pos) {
       return arrayInvoiceIdentifier.indexOf(elem) == pos;
    })
    // Loop through the unique invoice numbers to create individual invoices
    // invoice is an array of invoices
    // Need to filter it, but then create a "header" with information such as
    // CustomerCode, ExternalReference, InvoiceDate 
    // and lines - which will be an array within an "invoice" with:
    // GlCode, ProductCode
    feedTransactionArray = new Array();
    uniqueInvoices.forEach(function(Ref) {
      console.log('PROCESS INVOICE ' + Ref);
      var invLines = _.filter(arrayInvoice, { ExternalReference : Ref });
      // Some invoices have zero amounts (price) so would not be in arrayInvoice
      // not needing to load! 
      if ( invLines.length != 0 ) {
        // Now we have a filtered array of objects for this invoice - copy it
        // we will extract the first value to construct a header from the copy
        var copy4Head = clone(invLines);
        // extract one item from the clone of the lines (splice of array by
        // identifier (i.e. ExternalReference)
        var invoice = _.head(copy4Head);
        // And remove the "line" items from the copy that is the header
        // Remove the line amounts as this needs to be the header
        // lines to be added via an invLines array
      
        if (typeof invoice.StockItemDescription !== undefined) {
          delete invoice.StockItemDescription;
        }
        delete invoice.StockItemPrice;
        delete invoice.GLAccountCode;
        delete invoice.StockItemID;
        // format dates
        //console.log('Create Invoice for ' + JSON.stringify(invoice));
        // Then remove the header items from the original! 
        // TODO - Must be a better way to do this! 
        invLines.forEach(function(v){ delete v.ExternalReference, delete v.CustomerCode, delete v.UserId, delete v.InvoiceDate , delete v.OrderDate });
        // now we have a series of lines in an array ... 
        // some will have VAT amounts and some have net amounts
        // VAT amounts have "VAT" in the StockItemDescription
        // And in most cases that has a matching entry in the array 
        // The match will be for the Net Amount which will be 5 x as much
        // Need to find a match and add the amount as VatAmount TaxAmount
        // Must then get the appropriate VAT rate code to add to TaxCode
        // and calculate the TaxRate
        // Due to rounding on VAT amounts - need to actually test non vat lines!
        
        // Using GL code
        //console.log('Doing VAT MEREGE');
        //  When GlCode is 9999 - 20% VAT, 9998 - 4% VAT
        var nonVatLines = _.reject(invLines, { GLAccountCode : 9999 });
        nonVatLines = _.reject(nonVatLines, { GLAccountCode : 9998 });
        nonVatLines = _.reject(nonVatLines, { GLAccountCode : '' });
        // Deal with discounts which have been added as seperate lines
        // These lines have no GL Code
        var discountLines = _.filter(invLines, { GLAccountCode : ''  });
        var vatStdLines = _.filter(invLines, { GLAccountCode : 9999 });
        var vatReducedLines = _.filter(invLines, { GLAccountCode : 9998 });
        var vatLines = _.merge(vatStdLines, vatReducedLines);
	console.log('VAT LINES ARE ' + JSON.stringify(vatLines));
        var myNetAmount = 0;
        var myTaxAmount = 0;
        discountLines.forEach(function(v){ 
        // Will need to convert the Amount to a Rate when we match it to a line
          v.DiscountAmount = v.StockItemPrice ;
          v.Notes = v.StockItemDescription;
	  delete v.GLAccountCode; 
          delete v.StockItemDescription;
        });
        console.log('DISCOUNT LINES' + JSON.stringify(discountLines));
        vatLines.forEach(function(v){ 
          // Start of with the status of the transaction line as true (it is a good transaction line)
          // tidy up vat lines
          delete v.StockItemDescription;
          // Set the StockItemPrice (the LineAmount) to be the TaxAmount
          // as this is actually a VAT Line
          // toFixed returns a string - and we need a string to compare numbers
          v.TaxAmount = v.StockItemPrice.toFixed(4);
          v.VatGLAccountCode = v.GLAccountCode;
          delete v.StockItemPrice;
          delete v.GLAccountCode;
          //console.log('VatGLAccountCode is ' + v.VatGLAccountCode);
          if (v.VatGLAccountCode === 9998) { // VAT is 4%
            v.ExpectedNetAmount = (v.TaxAmount * 25).toFixed(2)/1;
            //console.log('Expecting 4% VAT - amount is ' + v.ExpectedNetAmount);
          } else { 
            v.ExpectedNetAmount = (v.TaxAmount * 5).toFixed(2)/1;
            //console.log('Expecting 20% VAT - amount is ' + v.ExpectedNetAmount);
          }
        });
        // Now loop through and try to match up VAT amouonts to Lines
        // On a match remove from the lines
        // On duplicate raise an error
        // On no match raise error (may be non VAT invoice)
        //console.log('NON VAT LINES ARE ' + JSON.stringify(nonVatLines));
        //console.log('VAT LINES ARE ' + JSON.stringify(vatLines));
        nonVatLines.forEach(function(v){
          // See if I have a discount line that has parent id matching 
          // my Reservedresourceid which is now called ReservedResourceID
          var isMatchDiscount =  _.filter(discountLines, { ParentID : v.ReservedResourceID });
          if (isMatchDiscount.length === 1) {
            console.log('DISCOUNT MATCH FOR ' + v.StockItemPrice + ':' + JSON.stringify(isMatchDiscount));
            console.log('isMatch Amount ' + isMatchDiscount[0].DiscountAmount);
            console.log('isMatch Line Note ' + isMatchDiscount[0].Notes);
            v.DiscountRate = isMatchDiscount[0].DiscountAmount / v.StockItemPrice;
            // Need to update the VAT line ExpectedNetAmount as we have reduced
	    // the line value
	    console.log('MY PARENT is ' + v.ReservedResourceID);
	    console.log('VAT LINES ' + JSON.stringify(vatLines));
	    console.log('NON VAT LINES ' + JSON.stringify(v));
          }
	  else { // no dodgy discounts
            v.DiscountRate = 0;
          }
	  // Build in the discount
          v.InvoicedQuantity = 1;	  
	  // ActualPrice aka DiscountPrice
          v.ActualPrice = (v.StockItemPrice * (1 - v.DiscountRate));
	  v.NetAmount = (v.ActualPrice * v.InvoicedQuantity);
	  // Round the net amount off and convert to string for comparison
	  v.NetAmount = v.NetAmount.toFixed(4)/1;
	  console.log('NOW WE HAVE NONVAT LINE ' + JSON.stringify(v));
	  // START Check VAT
          var isMatch =  _.filter(vatLines, { ExpectedNetAmount : v.NetAmount });
          if (isMatch.length === 1) {
            console.log(' WE HAVE A MATCH FOR ' + v.NetAmount + ':' + JSON.stringify(isMatch));
            console.log('isMatch Tax Amount ' + isMatch[0].TaxAmount);
            console.log('isMatch GL Code ' + isMatch[0].VatGLAccountCode);
            v.TaxAmount = isMatch[0].TaxAmount;
            // Now try to remove the matched element from the vatLines array
            vatLines = _.reject(vatLines, { ExpectedNetAmount: v.NetAmount });
            console.log('VAT LINES IS NOW ' + JSON.stringify(vatLines));
          } else
          if (isMatch.length === 0) {
            //console.log(' WE DO NOT HAVE A MATCH FOR ' + v.NetAmount );
            // So we did not find an exact match based on the amount
	    // 4 possible cases where this occured 
            // 1. The recurring 3´s ... where a line amount is something .6666
	    // the NetAmount becomes x.67 - and the Tax amount is y.33
            // when we multiply that by 5 to see what the ExpectedNetAmount is
	    // it becomes x.65 and as x.65 does not equal x.67 we fail to match
	    // SO ADD 2p and try again! 
            // Eventually just match to +/- 2p
	    var RecurringAmountMissed1 = (v.NetAmount + 0.02).toFixed(2)/1;
	    var RecurringAmountMissed2 = (v.NetAmount + 0.01).toFixed(2)/1;
	    var RecurringAmountMissedm1 = (v.NetAmount - 0.01).toFixed(2)/1;
	    var RecurringAmountMissedm2 = (v.NetAmount - 0.02).toFixed(2)/1;
	    console.log('Check if ROUNDING' ); 
            var isMatchMissed =  _.filter(vatLines, function(vatLine) { 
	      return vatLine.ExpectedNetAmount === RecurringAmountMissed1 || 
	        vatLine.ExpectedNetAmount === RecurringAmountMissed2  ||
	        vatLine.ExpectedNetAmount === RecurringAmountMissedm1  ||
	        vatLine.ExpectedNetAmount === RecurringAmountMissedm2 ;
	    });
            if (isMatchMissed.length === 1) {
              v.TaxAmount = isMatchMissed[0].TaxAmount;
              v.isWarning = { 'check': true, 'reason':'Matched VAT Found on Rounding Error' }
            } else if (v.GLAccountCode == "4004" && v.DiscountRate > 0 ) {
	    //
	    // 2. A discount was applied. the match on StockItemPrice
	    // to the tax line "ExpectedNetAmount" fails due discount
            // v.NetAmount may fail to match due to rounding errors
	    // But in that case we should have;
	    // a v.GLAccountCode = 4004, and v.ReservedResourceID = the tax lines
	    // ParentID, and we should be correct to 1 decimal place
            isMatchVATWithDiscount = _.filter(vatLines, { ParentID : v.ReservedResourceID });
            if (isMatchVATWithDiscount.length === 1) {
	      console.log('Looks like we have a discount line VAT match missed on rounding ... ');
	      var myTempNetAmount = v.NetAmount;
	      if ( myTempNetAmount.toFixed(1) == isMatchVATWithDiscount[0].ExpectedNetAmount.toFixed(1) ) {
	        // Looks like the line meets the rules for dodgy discount!
	        v.TaxAmount = isMatchVATWithDiscount[0].TaxAmount;
                v.isWarning = { 'check': true, 'reason':'Manual Check Advised before Posting. VAT should be checked as match was applied without rounding due to a discount being applied' }
	      }
	    }
	    // Now case two for VAT matching issues. VAT is in summary and 
	    // instead of for a single line.
	    // This occurs for non rent (4004) GL Codes. 
	    // VAT will be 20%
	    // VAT GL Code will be 9999 
	    // have a Productcode (now called StockItemID) set to vat20p
	    // All we can do is apply VAT at 20% and warn for a manual check
	    // But first check - is the VAT amount equal to all the non rent 
	    // lines as some lines are coming with no VAT!!!!! 
            } else if ( v.GLAccountCode != "4004" ) {
              isMatchVATAccumulated = _.filter(vatLines, { StockItemID : 'VAT20P' , VatGLAccountCode : 9999 });
	      console.log('ACCUMLATED VAT MATCH LENGTH ' + isMatchVATAccumulated.length);
              if (isMatchVATAccumulated.length === 1) {
	        //console.log('Total Tax on Invoice is ' + isMatchVATAccumulated[0].TaxAmount );
	        // Check the invLines array and sum up the amounts to see if we get a match ...
	        var totalTax = 0;
	        //  Drop off nonVatLine for rent
                var isAccumulatedNetAmounts =  _.reject(nonVatLines, function(nonVatLine) { 
	          return nonVatLine.GLAccountCode == '4004';
	        });
	        //console.log(JSON.stringify(isAccumulatedNetAmounts));
	        for (i = 0; i < isAccumulatedNetAmounts.length; i++) {  //loop through the array
	          // NetAmount is StockItemPrice (as no discounts, qty 1, and not yet calculated NetAmount for all lines!
                  totalTax += (isAccumulatedNetAmounts[i].StockItemPrice * 0.2);
                }
                //console.log('invLines TOTAL TAX WILL BE ' + totalTax.toFixed(2)/1);  
	        // If the VAT Matches then set it
                if ( totalTax.toFixed(2)/1 == isMatchVATAccumulated[0].TaxAmount ) {
	          //console.log('Looks like we have a match for ACCUMULATED VAT');
	          // All we can do is set the VAT and warn
	          v.TaxAmount = v.NetAmount * 0.2 ;
                  v.isWarning = { 'check': true, 'reason':'Accumulated VAT line found and simply set VAT to 20% of the Net Amount' }
	        } else { // reject the invoice 
                  v.updateStatus = { 'status': false, 'error':'Some missing VAT on extra items - have VAT amount ' + isMatchVATAccumulated[0].TaxAmount + ' but expected ' + totalTax.toFixed(2)/1 };
	        }
	      }
            } else if ( v.GLAccountCode == "4004" ) {
	    // Now the nasty one! This is where the VAT is split between rates
	    // Only occurs on Rent (so 4004 GL Cod e - if so can add that to message
              if ( vatLines.length === 1 ) { 
                v.updateStatus = { 'status': false, 'error':'Split Rate VAT - Please enter the invoice manually. One VAT Amount for ' + vatLines[0].TaxAmount + ' found. If all 20% should have been ' + (v.NetAmount * 0.2) };
		 // Special case though for Adjustments - they may have more than one rent line, and a single VAT line. However we are looping through the invoice lines and for that check we need to loop the VAT lines. However the invoice lines get an error at this point - so her we flag bot the vat line and invline
		 v.checkForMultipleRent = true;
		 // And as only 1 VAT line ..
		 vatLines[0].checkForMultipleRent = true;
	      } else {
                v.updateStatus = { 'status': false, 'error':'Split Rate VAT - Please enter the invoice manually' };
	      }
	    } else {
                v.updateStatus = { 'status': false, 'error':'No VAT Found' };
            }
          } else {
            //console.log(' WE HAVE A SERIOUS ISSUE - MATCHED MORE THAN ONE LINE: ' + isMatch.length + ' LINES FOUND');
            v.updateStatus = { 'status': false, 'error':'Multiple VAT Found' }
          }
          // END Check VAT - if got through that with no TaxAmount raise error
	  console.log('AFTER VAT CHECK ' + v.ExtRef + ' VATLINES IS ' + JSON.stringify(vatLines));
          if ( ! v.TaxAmount || v.TaxAmount == 0 || v.TaxAmount == '' ) {
            // and there is no error already! 
            if ( ! v.updateStatus ) {
	      v.updateStatus = { 'status': false, 'error':'No VAT Found' };
	    }
          }
          // reduce the amounts to two decimals 
          //v.StockItemPrice = v.StockItemPrice.toFixed(2);
          // Some defaults
          var rate = 0.20;
	  // hack to get make tax amount a number
	  // toFixed returns a string (needed above to compare) - so need 
          // to mess about a lot to get numbers back! 
	  var tempTaxAmount = (v.TaxAmount * 1);	
          v.TaxAmount = (tempTaxAmount.toFixed(2)/1);
	  var tempDiscountRate = (v.DiscountRate * 1);	
          v.DiscountRate = (tempDiscountRate.toFixed(2)/1);
	  var tempActualPrice = (v.ActualPrice * 1);	
          v.ActualPrice = (tempActualPrice.toFixed(2)/1);
	  v.TaxRate = (v.TaxAmount / v.ActualPrice); 
	  var tempTaxRate = (v.TaxRate * 1);	
          v.TaxRate = (tempTaxRate.toFixed(2)/1);
          sumTaxAmount += v.TaxAmount
          sumNetAmount += v.NetAmount
	  // Tax Amount is already on the line
	  // v.TaxAmount = 
	  // So calculate the Tax Rate (v.TaxAmount / v.ActualPrice 
	  v.GrossAmount = (1 * v.NetAmount + v.TaxAmount);
          sumGrossAmount += v.GrossAmount
          v.InvoiceItemID = 0;
          // Delete temp values that not needed for invoice Lines
          delete v.ReservedResourceID;
          //v.StockItemDescription = 'From Default';
        });
	// Special check for adjustments - multiple rent lines, with one vatLine
	if ( vatLines.length == 1 && typeof vatLines[0].checkForMultipleRent !== 'undefined' ) {
	  console.log('checkForMultipleRent');
          rentLines = _.filter(invLines, { GLAccountCode : 4004, checkForMultipleRent: true  });
          console.log(JSON.stringify(rentLines))	
          console.log(JSON.stringify(vatLines[0]))	
          totalNetAmount = _.sumBy(rentLines, 'NetAmount');
          ExpectedNetAmount = vatLines[0].ExpectedNetAmount;
	  // Assuming 20% VAt 
	  if ( ExpectedNetAmount == totalNetAmount ) {
	    console.log('A match for checkForMultipleRent ');
            console.log('Total Net' + totalNetAmount);
            console.log('Total Net' + ExpectedNetAmount);
	    // loop and set the TaxRate and TaxAmount on the invoiceLines
	    invLines.forEach(function(line) {
	      if ( line.GLAccountCode == '4004' && line.checkForMultipleRent == true ) {
	        line.TaxRate = 0.2;
		line.TaxAmount = line.NetAmount * line.TaxRate;
		line.GrossAmount = line.NetAmount + line.TaxAmount;
                delete line.updateStatus ;
                delete invoice.updateStatus;
	      }
	    })
            console.log(JSON.stringify(invLines))	
          }
        }
        // Check to see if any lines have an error ...
        // and calculate the invoice totals
        invoice.ExchangeRate = 1;
        invoice.NetAmount = 0;
        invoice.GrossAmount = 0;
        invoice.TaxAmount = 0;
        nonVatLines.forEach(function(v){
          invoice.NetAmount += v.NetAmount.toFixed(2)/1;
          invoice.GrossAmount += v.GrossAmount.toFixed(2)/1;
	  console.log('Invoice TAX CHECK ' + invoice.ExternalReference );
	  console.log('Invoice TAX CHECK ' + v.TaxAmount );
	  console.log('Invoice TAX CHECK ' + v.TaxRate );
	  // Adjustments - getting a lot with no tax amount so default to zero
	  if ( v.TaxAmount == null ) {
	    console.log('NO TAX AMOUNT');
	    v.TaxAmount = 0;
	  }
	  if ( v.TaxRate == null ) {
	    console.log('NO TAX RATE');
	    v.TaxRate = 0;
	  }
          invoice.TaxAmount += v.TaxAmount.toFixed(2)/1;
	  // check to see if any lines are incorrect - if any staus is false	
          if (v.hasOwnProperty('updateStatus')) {
            delete invoice.updateStatus; 
          } 
          // Calculate the sum of the net and Tax and Gross Amoubts
        });
        //console.log('LINES IN ERROR ' + JSON.stringify(invoice.updateStatus));
        invoice.lines = nonVatLines;
        // Round off the header values
        var tempNetAmount = (invoice.NetAmount * 1);	
        invoice.NetAmount = (tempNetAmount.toFixed(2)/1);     
        var tempGrossAmount = (invoice.GrossAmount * 1);	
        invoice.GrossAmount = (tempGrossAmount.toFixed(2)/1);     
        var tempTaxAmount = (invoice.TaxAmount * 1);	
        invoice.TaxAmount = (tempTaxAmount.toFixed(2)/1);     
        // note the number of lines
        invoice.lineCount = nonVatLines.length;
	// Mandatory Dates
        today = new Date();
        invoice.CreationDate = today.toISOString().slice(0,10);
        invoice.DeliveryDate = today.toISOString().slice(0,10);
	console.log('JUST SET DATE ' +  invoice.DeliveryDate)
        if ( invoice.lineCount == 0 ) {
          invoice.updateStatus = { 'status': false, 'error':'No lines recorded' };
        } else { // we have lines
	// AMMENDMENTS - change from invoices 
	// If we have no VAT lines, and the NetAmount totals to zero then we are to drop the transaction (as it is not needed in AIQ as per client instruction - it is a change of booking with no charge so not required ...
          totalNetAmount = _.sumBy(invoice.lines, 'NetAmount');
          console.log('SUM NETAMOUNT IS ' + totalNetAmount + ' linecount ' +  invoice.lines.length)
	  if ( invoice.lines.length !== 0 && totalNetAmount == 0) {
            invoice.updateStatus = { 'status': false, 'error':'Invoice Totals to Zero' };
            console.log('DROP SUM NET AMOUNT  AND NOT VAT ON ' + invoice.ExtRef);
	    invoice.updateStatus = { 'status': false, 'error': 'Not processing as no VAT and line amounts total 0' };
	    invoice.lines.forEach(function(v) {
	      // Adjustments - getting a lot with no tax amount so default to zero
	      console.log(JSON.stringify(v));
	      v.TaxAmount = 0;
	      v.TaxRate = 0;
              v.updateStatus = { 'status': false, 'error':'Invoice Totals to Zero' };
	      console.log(JSON.stringify(v));
	   });
          }
          // Case 2 - we have a record that has not matched, but the total amount does not equal zero. It has positive and negative entries ...
	 if ( invoice.lines.length !== 0  && totalNetAmount !== 0 ) {
	   positiveLines = _.filter(invoice.lines, function(v) { return v.NetAmount > 0 })
	   negativeLines = _.filter(invoice.lines, function(v) { return v.NetAmount < 0 })
	   console.log('Number of positive lines ' + positiveLines.length);
	   console.log('Number of negative lines ' + negativeLines.length);
	   if (positiveLines.length >= 0 && negativeLines.length >= 0 ) {
	     console.log('POSITIVE ' + JSON.stringify(positiveLines));
	     console.log('NEGATIVE ' + JSON.stringify(negativeLines));
	     console.log('VAT ' + JSON.stringify(vatLines));
	   }
         }
        }
        feedTransactionArray.push(invoice);
      }
    })
    return feedTransactionArray;
  }
*/
