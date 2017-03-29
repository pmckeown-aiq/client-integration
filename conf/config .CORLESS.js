  // Don't commit this file to your public repos. This config is for first-run
  //
 exports.envs = 
  [
   {
   url: 'https://www.visorsoftware.com/system/dashboard/integration/integration_1_1.asmx?WSDL',
   pKey: 'ZGfaC2nJm1awEx+i3Z+FzfOtAHlArZZxMJURtQgu28XDS51j8tsI3OonFnjF+XIqYUujfqn4kjCbo5buMGY1VWyUjYAqp/fc4Z4mMJKF4hF7qIGn1x5XY5oZ5dMYZc7G',
   uKey: '8KYbmseEdiDxCJU8+9VxsbgRjQFPkYDcJ9kAjMocYr4WqDFm3SJWmYTBUMqO5RTaEqGjIAdPP9P24K6J8MADf2yqbgxgstSbjLu0Ii7M12kiqdQWBcsIxgB3FZDQcw5BBqB2HKL3x4imNH513TgGIv7tEqamQU/eCuTvJssSCqS0H0JKWRFrVG62yK57BwSX',
   coID: 'cor1000'
  },
  {
   url: 'https://www.visorsoftware.com/system/dashboard/integration/integration_1_1.asmx?WSDL',
   pKey: 'ZGfaC2nJm1awEx+i3Z+FzfOtAHlArZZxMJURtQgu28XDS51j8tsI3OonFnjF+XIqYUujfqn4kjCbo5buMGY1VWyUjYAqp/fc4Z4mMJKF4hF7qIGn1x5XY5oZ5dMYZc7G',
   uKey: '8KYbmseEdiDxCJU8+9VxsbgRjQFPkYDcJ9kAjMocYr4WqDFm3SJWmYTBUMqO5RTa/Zrm6teydJcB+lDZmH1yMcCbG0KY2rMpeJOoDIs//xqo95h0IXO8cOkzOrJQTGA+vlp3CHtFDVTwrXtMVSK8UhdEU7jOCiHgNByCX14eKxtDft18AcZgQf1Fabr1/bUU',
   coID: 'cor5776'
  }
 ];
 exports.integrationTypes = 
 [
  {
    type: 'Invoices',
    processor: 'processInvoices',
    updater: 'updateInvoices',
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
  },
  {
    type: 'Payments',
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
    type: 'Adjustments',
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
