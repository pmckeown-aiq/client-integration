  // Don't commit this file to your public repos. This config is for first-run
  //
 exports.envs = 
  [
   {
    url : 'https://hostacct.com/system/dashboard/integration/integration_1_1.asmx?WSDL',
    pKey : 'ZGfaC2nJm1awEx+i3Z+FzfOtAHlArZZxMJURtQgu28XDS51j8tsI3OonFnjF+XIqYUujfqn4kjCbo5buMGY1VWyUjYAqp/fc4Z4mMJKF4hF7qIGn1x5XY5oZ5dMYZc7G',
    uKey : '8KYbmseEdiDxCJU8+9VxsbgRjQFPkYDcJ9kAjMocYr4WqDFm3SJWmYTBUMqO5RTaTwzgOVBwn351kDC65YekmjKq2ecbJcXWGQUveYWYLA7GLNZyWpI/5jC5kMvDc8iYKDtEO9NVwuMKpTJfIlORYeu07DH9JW91uVrEGzNQMuEqN9XCPuY4wzDlSVWMQW58',
    coID : 'vis5202',
  },
 ];
 exports.integrationTypes = 
 [
  {
    type: { type: 'AxiosHarvestInvoices', feedType: 'api-harvest',
	    // filters name must be valid for the API that you are pushing them at
	    // so Harvest supports "to" and "from" in the API call to list invoices
            loadDataFilters: [ 
                    { name: 'from', type: 'date', required: true, label: 'Invoices From: ' },
                    { name: 'to', type: 'date', required: true, label: 'Invoices To: ' }
            ]
    },
    loadFrom: 'harvestApi',
    processWith: './processData/axios/Invoices',
    updateVia: 'updateInvoices',
    hasLines: true,
    displayHeaderValues : [
      { name: 'ExternalReference', displayName: 'External Reference'},
      { name: 'AccountID', displayName: 'Customer Code'},
      { name: 'InvoiceDate', displayName: 'Invoice Date'},
      { name: 'NetAmount', displayName: 'Net Amount'},
      { name: 'TaxAmount', displayName: 'Tax Amount'},
      { name: 'lineCount', displayName: 'No Lines'},
    ],
    displayLineValues : [
      { name: 'StockItemID', displayName: 'Item Code'},
      { name: 'StockItemDescription', displayName: 'Description'},
      { name: 'InvoicedQuantity', displayName: 'Qty.'},
      { name: 'StockItemPrice', displayName: 'Price'},
      { name: 'NetAmount', displayName: 'Net Amount'},
      { name: 'TaxAmount', displayName: 'Tax Amount'},
      { name: 'DepartmentID', displayName: 'Dept. Code'},
      { name: 'isCorrect', displayName: 'Message'},
    ],
    valuesToValidate : [
      { name: 'StockItemID', via: 'GetActiveStockItemList', canCreate: true, getFromSource: true },
      { name: 'AccountID', via: 'GetActiveCustomerList' , canCreate: true, getFromSource: true},
    ],
  },
  {
    type: { type: 'Invoices', feedType: 'csv' },
    loadFrom: 'loadCsv',
    processWith: './processData/corless/Invoices',
    updateVia: 'updateInvoices',
    hasLines: true,
    displayHeaderValues : [
      { name: 'ExternalReference', displayName: 'External Reference'},
      { name: 'InvoiceDate', displayName: 'Invoice Date'},
      { name: 'OrderDate', displayName: 'Order Date'},
      { name: 'NetAmount', displayName: 'Net Amount'},
      { name: 'GrossAmount', displayName: 'Gross Amount'},
      { name: 'TaxAmount', displayName: 'Tax Amount'},
      { name: 'lineCount', displayName: 'No Lines'},
      { name: 'AccountID', displayName: 'Customer Code'},
    ],
    displayLineValues : [
      { name: 'StockItemID', displayName: 'Item Code'},
      { name: 'GLAccountCode', displayName: 'GL Code'},
      { name: 'TaxCode', displayName: 'Tax Code'},
      { name: 'DepartmentID', displayName: 'Dept. Code'},
      { name: 'StockItemDescription', displayName: 'Description'},
      { name: 'NetAmount', displayName: 'Net Amount'},
      { name: 'TaxAmount', displayName: 'Tax Amount'},
      { name: 'DiscountRate', displayName: 'Discount Rate'},
      { name: 'GrossAmount', displayName: 'Gross Amount'},
      { name: 'isCorrect', displayName: 'Message'},
    ],
    valuesToValidate : [
      { name: 'StockItemID', via: 'GetActiveStockItemList', canCreate: true, getFromSource: false },
      { name: 'AccountID', via: 'GetActiveCustomerList' , canCreate: true, getFromSource: false},
      { name: 'TaxCode', via: 'GetTaxCodeList' , canCreate: true, getFromSource: false},
      { name: 'DepartmentID', via: 'GetDepartmentList' , canCreate: true, getFromSource: false},
      { name: 'GLAccountCode', via: 'GetGLAccountList' , canCreate: true, getFromSource: false},
    ],
  },
  {
    type: { type: 'Payments', feedType: 'csv' },
    processor: 'processPayments',
    updater: 'loadPayments',
    hasLines: false,
    displayHeaderValues : [
      { name: 'ExternalReference', displayName: 'External Reference'},
      { name: 'GLAccountCode', displayName: 'Account Code'},
      { name: 'PaymentDate', displayName: 'Payment Date'},
      { name: 'PaymentType', displayName: 'Payment Type'},
      { name: 'PaymentAmount', displayName: 'Payment Amount'},
    ]
  },
  {
    type: { type: 'Adjustments', feedType: 'csv' },
    feedType: 'csv',
    processor: 'processAdjustments',
    updater: 'loadAdjustments',
    hasLines: false,
  },
 ];
 exports.creds = {
	 returnURL: 'http://localhost:3000/auth/openid/return',
 	identityMetadata: 'https://login.microsoftonline.com/common/.well-known/openid-configuration', // For using Microsoft you should never need to change this.
        clientID: 'e641159a-2a8a-4909-adfd-7e017a0cb617',
        clientSecret: 'F4HU7khLw5amoMnEm8NYMUuilfhhjxRaNWC4kWyO8gU=',
 	skipUserProfile: true, // for AzureAD should be set to true.
 	responseType: 'id_token', // for login only flows use id_token. For accessing resources use `id_token code`
 	responseMode: 'query', // For login only flows we should have token passed back to us in a POST
 	validateIssuer: false,
 	//scope: ['email', 'profile'] // additional scopes you may wish to pass
 };
