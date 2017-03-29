'use strict';
var Q = require('q');

var errors = [
   "Invalid credentials",
   "Unkown error",
   "API error",
   "Login error",
   "No Result",
   "Result error",
   "Result undefined error",
   "Not Expected Result Type (object)"
]

var errorCodes = {
   INVALID_CREDENTIALS: 0,
   UNKNOWN_ERROR: 1,
   API_ERROR: 2,
   LOGIN_ERROR: 3,
   NO_RESULT: 4,
   RESULT_ERROR: 5,
   RESULT_UNDEFINED_ERROR: 6,
   RESULT_UNEXPECTED_ERROR: 7,
   RESULT_ERROR_TYPE_1: 8,
   RESULT_ERROR_TYPE_2: 9,
   RESULT_ERROR_TYPE_3: 10,
   RESULT_NOT_ARRAY: 11
};


function aiqClient(soapClient, partnerKey, userKey, companyId) {
        this.partnerKey = partnerKey;
        this.userKey = userKey;
        this.companyId = companyId;
        this.soapClient = soapClient;
        this.token = null;
        console.log('companyID is ' + this.companyId)
        // Map the name of the method to its return type
        var mapping = {
            LoginOnly: '',
            GetDepartmentList: 'Department',
            GetGLAccountList: 'ArrayOfString',
            GetCreditTermList: 'CreditTerm',
            GetTaxCodeList: 'Tax',
            GetBankDefaults: 'AuthorUserID', // not working - result not right format
            GetBankList: 'Bank',
            GetCurrencies: 'WSCurrency',
            GetActiveCustomerList: 'Customer',
	    GetCustomerDefaults: 'AccountDefaults',
	    GetActiveStockItemList: 'StockItem',
            GetNewCustomerFromDefaults: 'N/A',
            GetNewSalesInvoice: 'N/A',
            GetNewSalesCreditNote: 'N/A',
	    GetInvoicesByExternalReference: 'Invoice',
            GetCustomer: 'Customer',
            UpdateCustomer: 'N/A',
            SaveInvoiceGetBackInvoiceID: 'N/A',
            SaveCreditNoteGetBackCreditNoteID: 'N/A'
        };

        // Automatically create the API methods
        Object.keys(mapping).forEach((name) => this[name] = this.genericCall(name, mapping[name]));
    }
aiqClient.prototype.login = function(forceRefresh) {
        //console.log('in login in aiqClient');
        if (this.token && !forceRefresh)
            return Q.when([this.token]);

        var loginArgs = { companyID: this.companyId, partnerKey: this.partnerKey, userKey: this.userKey }
        var res = Q.defer();
        Q.ninvoke(this.soapClient, "Login", loginArgs)
            .then((tk) => {
                //console.log('LAST SOAP FROM LOGIN ' + this.soapClient.lastRequest) // to LOG the last client request SOAP
                if (!tk || !tk.length || !tk[0] || typeof (tk[0].LoginResult) === 'undefined')
                    return res.reject({ error: errorCodes.UNKOWN_ERROR });

                if (!tk[0].LoginResult)
                    return res.reject({ error: errorCodes.INVALID_CREDENTIALS });
                this.token = tk[0].LoginResult;

                //console.log('logged in with session ', this.token)
                res.resolve(this.token);
            })
            .fail(() => res.reject({ error: errorCodes.UNKNOWN_ERROR }));

        return res.promise;
    }

aiqClient.prototype.genericCall = function(name, returnType) {
        return function () {
	    console.log('genericCall running with ' + JSON.stringify(name));
            var res = Q.defer();
            var args = arguments.length ? (arguments[0] || {}) : {};
            this.login().then((token) => {
                args['token'] = token;
		//console.log('ARGS ARE  ' + JSON.stringify(args));
                Q.ninvoke(this.soapClient, name, args)
                    .then((result) => {
                     console.log('XML Request ' + this.soapClient.lastRequest); // to LOG the last client request SOAP
                     if ( !result || !result.length ) {
		       console.log('about to return in aiqClient 3');
                       return res.fail({error: errorCodes.RESULT_ERROR_TYPE_1});
		     }
		     if ( !result[0] ) {
		       console.log('about to return in aiqClient 4');
                       return res.fail({error: errorCodes.RESULT_NOT_ARRAY});
		     }
		     if ( typeof result[0][`${name}Result`] === 'undefined' ) {
		       console.log('about to return in aiqClient 5');
                       return res.fail({error: errorCodes.RESULT_ERROR_TYPE_2});
		     }
                     if (  !result[0].hasOwnProperty(`${name}Result`) ) {
		       console.log('about to return in aiqClient 6');
                       return res.fail({error: errorCodes.RESULT_ERROR_TYPE_3});
		     }

                     result = result[0][`${name}Result`];
                     console.log('Got Result for ' + name + ':' + JSON.stringify(result.Status));
                     console.log('Got Result for ' + name + ':' + JSON.stringify(result));
		     return res.resolve(result);
		     console.log('why am i here???');
                     //process.send({ soapResult : JSON.stringify(result.Status), name: JSON.stringify(result.Result),  });

		     console.log('about to return in aiqClient 7');
                     if( result.HasExpired ) // If the token has expired, we need to log in again
                        return this.login(true).then(name.then(res.resolve).fail(res.reject)).fail(res.reject);
 
		     console.log('about to return in aiqClient 8');
                     if( result.Status !== 'Success' && result.Status != 'Created' )
                        return res.reject({error: errorCodes.API_ERROR, status: result.Status, message: result.ErrorMessage, code: result.ErrorCode})

                     // PETER: new line here to handle non-typed returned
                     if( returnType === 'N/A' )
                        return res.resolve(result.Result)
 
                     if( typeof result.Result === 'undefined' || typeof result['Result'][returnType] === 'undefined' ) // Malformed
                        return res.reject({error: errorCodes.UNKNOWN_ERROR});
 
		     console.log('about to return in aiqClient 9');
                     return res.resolve(result.status);
                     //return res.resolve(result['Result'][returnType]);
                   })
                  .fail((error) => {
                    console.log('FAIL TO CALL THEN AFTER API CALL ' + this.soapClient.lastRequest); // to LOG the last client request SOAP
                    console.log(' not a success ' + JSON.stringify(error));
                    res.reject({error: errorCodes.API_ERROR});
                  })
                  //.fail(() => res.reject({error: errorCodes.UNKNOWN_ERROR}))
              })
              .fail(() => {
                console.log('FAILED COMPLETLEY IN AIQCLIENT ' + this.soapClient.lastRequest); // to LOG the last client request SOAP
	        res.reject({error: errorCodes.UNKNOWN_ERROR});
              })
              return res.promise;
      }
   }
module.exports = aiqClient;
