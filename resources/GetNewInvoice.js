// fs required for attaching documents
var fs = require('fs-extra');

// fs required for attaching documents
// function to encode file data to base64 encoded string
function base64_encode(file) {
    // read binary data
    var attachment = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    return new Buffer(attachment).toString('base64');
}

// required for GetTransactionsByExternalReference
var _ = require('lodash');

module.exports = GetNewInvoice = function(v) {
    return new Promise(function(resolve, reject) {
    //console.log('GetNewInvoice comes with ' + JSON.stringify(v));
    Promise.all([aiq[transactionTemplate]({[templatingType]: v[templatingValue] })])
      .then((result) => {
        //console.log('GetNewInvoice Got result from Promise.all ' + JSON.stringify(result));
        result = result[0].Result;
        //console.log('GetNewInvoice Got result[0].Result from Promise.all ' + JSON.stringify(result));
        // r is now a template - but not a complete template! It is missing a few required fields ... so we add them 
        result.OrderNumber = '';
        result.PaymentMethodID = '';
        result.AreaID = '';
        result.Contact = '';
        result.Notes = '';
        result.DepartmentID = '';
        // need to check if the CurrencyCode on the invoice is NOT The same as the currency code on the default
        // If it is need to delete the exchange rate as that messes things up! 
        if ( result.CurrencyCode != v.CurrencyCode ) {
          //console.log('Got Invoice NOT IN ACCOUNT CURRENCY');
          // We are not creating an invoice with the suppliers base currency 
          // So need to update the transaction to be in the suppliers base currency
          // update the lines
          result.BCNetAmount = 0;
          result.BCTaxAmount = 0;
          result.NetAmount = 0;
          result.TaxAmount = 0;
          v.lines.forEach(function(line) {
            line.StockItemPrice = parseFloat(line.StockItemPrice) * parseFloat(result.ExchangeRate);
            line.ActualPrice = parseFloat(line.ActualPrice) * parseFloat(result.ExchangeRate);
            result.BCNetAmount += parseFloat(line.NetAmount);
            result.BCTaxAmount += parseFloat(line.TaxAmount);
            line.NetAmount = parseFloat(line.NetAmount) * parseFloat(result.ExchangeRate);
            line.TaxAmount = parseFloat(line.TaxAmount) * parseFloat(result.ExchangeRate);
            result.NetAmount += parseFloat(line.NetAmount);
            result.TaxAmount += parseFloat(line.TaxAmount);
            //result.CurrrencyCode = JSON.parse(JSON.stringify(v.CurrencyCode)); // actual static copy!
          })
          result.GrossAmount = parseFloat(result.NetAmount) + parseFloat(result.TaxAmount);
          result.BCGrossAmount = parseFloat(result.BCNetAmount) + parseFloat(result.BCTaxAmount);
        }
        // AccountBranchID is a number - not the customer code
        result.AccountBranchID = result.AccountID
        delete v.AccountID_getFromApiValue;
        delete v.$$hashKey;
        //console.log('3 Got result.Result from Promise.all' + JSON.stringify(result));
        // Remove the angular has key from the data we are to send
        for (var i=0;i<v.lines.length;i++) {
          delete v.lines[i].$$hashKey;
          // Remove warnings added to line when amounts calculated
          // only needed for logging
          delete v.lines[i].isWarning;
          if ( typeof v.lines[i].TaxAmount == "undefined" ) {
            //console.log('We have no TaxAmount - assume 0');
            v.lines[i].TaxAmount = 0;
          }
          if ( typeof v.lines[i].DiscountRate == "undefined" ) {
            //console.log('We have no DiscountRate - assume 0');
            v.lines[i].DiscountRate = 0;
          } 
          if ( typeof v.lines[i].ActualPrice == "undefined" ) {
            v.lines[i].ActualPrice = (v.lines[i].StockItemPrice * (1 - v.lines[i].DiscountRate))
          }
          if ( v.lines[i].ActualPrice ==  null ) {
            v.lines[i].ActualPrice = (v.lines[i].StockItemPrice * (1 - v.lines[i].DiscountRate))
          }
          // Notes must be chopped to 250 characters (limit in DB)
          if ( typeof v.lines[i].Notes !== 'undefined' ) {
            v.lines[i].Notes = v.lines[i].Notes.substring(0,250);
          }
          v.lines[i].GrossAmount = (v.lines[i].NetAmount*1) + (v.lines[i].TaxAmount*1);
          //console.log('IS ' + v.ExternalReference + ' negative: ' + v.negativeAmounts );
          if ( v.negativeAmounts == true ) {
            // make the amounts positive (as they are negative - or should be!) 
            v.lines[i].StockItemPrice =  v.lines[i].StockItemPrice * -1
            v.lines[i].NetAmount =  v.lines[i].NetAmount * -1
            v.lines[i].TaxAmount =  v.lines[i].TaxAmount * -1
            v.lines[i].GrossAmount =  v.lines[i].GrossAmount * -1
            v.lines[i].ActualPrice =  v.lines[i].ActualPrice * -1
          }
        };
        //console.log('Lines are ' + JSON.stringify(v.lines));
        // lines must become lines.invoiceLine(its the way the SOAP API expects it ... also needs to be "Lines"  on "result"
        var tempLines = { "InvoiceLine" : v.lines };
        delete v.lines;
        v.Lines = tempLines;
        //console.log('TEMP LINES is ' + JSON.stringify(tempLines));
        // Notes must be chopped to 250 characters (limit in DB)
        if ( typeof v.Notes !== 'undefined' ) {
          v.Notes = v.Notes.substring(0,250);
        }
        ////console.log('Final Invoice is ' + JSON.stringify(v));
        // loop through the transaction object (v) to set the supplied value in the JSON document to the result from GetNewSalesInvoice
        // May not have header amoungt fields ... can supply as 0 and leave AIQ to work out
        if ( typeof v.NetAmount == "undefined" ) {
          v.NetAmount = 0;
        }
        if ( typeof v.TaxAmount == "undefined" ) {
          v.TaxAmount = 0;
        }
        v.GrossAmount = (v.NetAmount*1) + (v.TaxAmount*1);
        // Transpose v into result (update the SOAP invoice
        for (var name in v) {
          if ( name != "transactionType" ) {
            if ( name != "uniqueExternalReferences" ) {
              if ( name != "transactionTemplate" ) {
                if ( name != "CurrencyCode" ) {
                if ( name != "NetAmount" ) {
                if ( name != "TaxAmount" ) {
                if ( name != "GrossAmount" ) {
                if ( name != "ExchangeRate" ) {
                  //console.log(name + ' has value ' + v[name]);
                  // and apply to result the corresponding value in feed transactions (referenced as v)
                  result[name] = v[name];
                }
                }
                }
                }
                }
              }
            }
          }
        };
        //console.log('AIQ Invoice is transposed to result complete' + JSON.stringify(result));
        updateStageStatus = {"stage" : "GetNewInvoice", "status": true, "serverStatus" : "Success", "message" : "Template complete"};
        result.updateStageStatus.push(updateStageStatus);
        resolve(result);
      })
      .catch(function(err) { // SOAP error on Save Invoice
        //console.log('SOAP Error' + JSON.stringify(err));
        updateStageStatus = { "stage" : "GetNewInvoice", "status": false, "serverStatus" : v.Status, "message" : "Failed to complete saveInvoice", "error": JSON.stringify(err)};
        v.updateStageStatus.push(updateStageStatus);
                    //console.log('UpdateStageStatuse ' + v.updateStageStatus);
        reject(v);
      });
    });
  }
