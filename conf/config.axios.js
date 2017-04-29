  // Don"t commit this file to your public repos. This config is for first-run
  //
 exports.codeMaintenanceSettings = {
  "CurrencyCode": { 
    "validateWith":"GetCurrencies",
    "batch": true,
    "invalidMessage":"Invalid/Missing Currency Code",
    "abortRun":false
  },
  "StockItemID": { 
    "validateWith":"GetActiveStockItemList",
    "createWith":"SaveStockItem",
    "batch": true,
    "invalidMessage":"Invalid/Missing Item Code",
    "abortRun":false
  },
  // CustomerCode - default is for sales
  "CustomerCode": { 
    "validateWith":"GetActiveCustomerList",
    "templateWith":"GetNewCustomerFromDefaults",
    "createWith":"UpdateCustomer",
    "batch": true,
    "invalidMessage":"Customer Code Missing",
    "abortRun":false
  },
  // SupplierCode - default is for sales
  "SupplierCode": { 
    "validateWith":"GetActiveSupplierList",
    "templateWith":"GetNewSupplierFromDefaults",
    "createWith":"UpdateSupplier",
    "batch": true,
    "invalidMessage":"Supplier Code Missing",
    "abortRun":false
  },
  "DepartmentID": { 
    "validateWith":"GetDepartmentList",
    "invalidMessage":"Department Code Missing",
    "batch": true,
    "abortRun":false
  },
  "TaxCode": { 
    "validateWith":"GetTaxCodeList",
    "invalidMessage":"Tax Code Missing",
    "batch": true,
    "abortRun":false
  },
  "TaxRate": { 
    "validateWith":"GetTaxCodeList",
    "invalidMessage":"Tax Rate Could Not Be Mapped to Tax Code",
    "batch": true,
    "abortRun":false
  },
  "GLAccountCode": { 
    "validateWith":"GetGLAccountList",
    "invalidMessage":"GL Account Code Missing",
    "batch": true,
    "abortRun":false
  }
 }
 exports.envs = 
  [
  {
    "coID" : "axi1003",
    "coDescription" : "Axios Development Environment",
    "conn": { 
    "url" : "https://hostacct.com/system/dashboard/integration/integration_1_1.asmx?WSDL",
    "pKey" : "ZGfaC2nJm1awEx+i3Z+FzfOtAHlArZZxMJURtQgu28XDS51j8tsI3OonFnjF+XIqYUujfqn4kjCbo5buMGY1VWyUjYAqp/fc4Z4mMJKF4hF7qIGn1x5XY5oZ5dMYZc7G",
    "uKey" : "8KYbmseEdiDxCJU8+9VxsbgRjQFPkYDcJ9kAjMocYr4WqDFm3SJWmYTBUMqO5RTasCBInjdugv/t7tTuIo5KHQ0doHobPTa2ALzBapE+qx7XKpClnq6ANeXHkn7OYcuUp8soGFgCAwKYJWH98eTIw2qtjwwRvs8hcsgiswP07d5v6ifYUTQWzqfBlV6U9FyG"
    },
    "additionalEnvs":       
      [ 
        { "coID" : "axi1004", "identifiedBy": { "name":"EnvironmentIdentifier", "value": "AXI4318" }, "uKey" : "8KYbmseEdiDxCJU8+9VxsbgRjQFPkYDcJ9kAjMocYr4WqDFm3SJWmYTBUMqO5RTasCBInjdugv/t7tTuIo5KHQ0doHobPTa2ALzBapE+qx7DcoRxBvchrxwrlppVhf7g+LwORvXh2ExFmSEyHCnRYartVyl0W5OrrJhj+t6ppM55ww5mWbXy76VVu7ai96+w" },
        { "coID" : "axi1002", "identifiedBy": { "name":"EnvironmentIdentifier", "value": "AXI1717" }, "uKey" : "8KYbmseEdiDxCJU8+9VxsbgRjQFPkYDcJ9kAjMocYr4WqDFm3SJWmYTBUMqO5RTasCBInjdugv/t7tTuIo5KHQ0doHobPTa2ALzBapE+qx4TdXMfhOXml6VVlcU18NNq59HLnsrU/OMhneYoc4IaNNKbn7M9wRZU5xc6Kt61+1pgrsrjsEBjcGQ527K29HCV" }
      ]
  },
  {
    "coID" : "axi1731",
    "coDescription" : "Axios Production Environment",
    "conn": { 
    "url" : "https://hostacct.com/system/dashboard/integration/integration_1_1.asmx?WSDL",
    "pKey" : "ZGfaC2nJm1awEx+i3Z+FzfOtAHlArZZxMJURtQgu28XDS51j8tsI3OonFnjF+XIqYUujfqn4kjCbo5buMGY1VWyUjYAqp/fc4Z4mMJKF4hF7qIGn1x5XY5oZ5dMYZc7G",
    "uKey" : "8KYbmseEdiDxCJU8+9VxsbgRjQFPkYDcJ9kAjMocYr4WqDFm3SJWmYTBUMqO5RTaJ73eW4+zft5UX1gel6E551SvVr/u4z9U40cK7GIFwYDRILM65mxinK30teM6oFL6SiVZTn0RKbxbj2JWrBhridoz/tE3vLnCKKLq/BmzI5BFzlAiweOW1EP2s76Moigy"
    },
    "additionalEnvs":       
      [ 
        { "coID" : "axi4318", "identifiedBy": { "name":"EnvironmentIdentifier", "value": "AXI4318" }, "uKey" : "8KYbmseEdiDxCJU8+9VxsbgRjQFPkYDcJ9kAjMocYr4WqDFm3SJWmYTBUMqO5RTasCBInjdugv/t7tTuIo5KHWkpocU7Ml6vFt+FtSsvc4VjZtI+fLSqXu3LmRAKki+e/kH6lcHlwWB49lfwD38es3pyVtQQLLsO+yFWJTweafLOuKAFaBEmg5CdeqsD+O30" },
        { "coID" : "axi1717", "identifiedBy": { "name":"EnvironmentIdentifier", "value": "AXI1717" }, "uKey" : "8KYbmseEdiDxCJU8+9VxsbgRjQFPkYDcJ9kAjMocYr4WqDFm3SJWmYTBUMqO5RTasCBInjdugv/t7tTuIo5KHWkpocU7Ml6vFt+FtSsvc4WYPsbb8aM/JPbFmUQhBr7aWDcZvAhSb6F4Ie6oB3ixuN20/tZeFtO4YQgGiIknM1h9UNyydQ7ZWp924DDxFTEa" }
      ]
  },
 ];
 exports.integrationTypes = 
 [
  {
    type: { "clientName": "axios", "type": "AxiosHarvestInvoices", "displayName": "Axios Harvest Sales Invoices", "feedType": "api-harvest",
    configuredEnvironments: [ "vis5202", "axi1732", "axi1731", "axi1003" ],
      // filters name must be valid for the API that you are pushing them at
      // so Harvest supports "to" and "from" in the API call to list invoices
      loadDataFilters: [ 
        { name: "from", type: "date", required: true, label: "Invoices From: " },
        { name: "to", type: "date", required: true, label: "Invoices To: " }
      ]
    },
    processRules: {
      loadFrom: "harvestSalesInvoicesApi",
      processScript: "./clients/axios/scripts/processData",
      updateDataScript: "/shared/updateData",
      loadDataScript: "/shared/loadData",
      transactionType: "SaveItemInvoice",
      transactionTemplate: "GetNewSalesInvoice",
      // we can create Credit Notes from the SaveItemInvoice ... 
      negativeTransactionType: {"allow":true, transactionType: "SaveItemInvoice", transactionTemplate: "GetNewSalesCreditNote", identifyBy: "NetAmount" },
    },
    apiFilters: [ { name: "status", loop: true, value:["sent", "paid" ] } ],
    clientSettings: {
      hasLines: true,
      headerValues : [
        { name: "InvoiceID", supplied: "never", display: false},
        { name: "CustomerCode", mandatory: true, supplied: true, value: "client_id", display: true, displayName: "Customer Code", map:true, validate: {"exists":true, "ignoreCase":true, "ignoreCase":true, getFromApi:true }},
        { name: "AreaID", supplied: false, display: false},
        { name: "CurrencyCode", mandatory: true, supplied: true, display:true, displayName:"Currency", value: "currency.slice(-3)", validate: {"exists":true }},
        { name: "CurrrencyCode", mandatory: true, supplied: true, display:false, displayName:"Currency", value: "currency.slice(-3)" },
        { name: "CurrrencyCode", supplied: "never", display: false},
        { name: "AccountTaxCode", supplied: false, display: true, displayName: 'Ac Tax Code', default:true, defaultValue: { getFromValidation:true, getFromObject: "CustomerCode", getObjectName: 'DefaultTaxCode' }},
        { name: "PaymentMethodID", supplied: false, display: false},
        { name: "ShipmentViaID", supplied: false, display: false},
        { name: "InvoiceNumber", supplied: false, display: false},
        { name: "ExternalReference", mandatory: true, supplied: true, value:"number", display: true, displayName: "External Reference", validate: {"exists":false}},
        { name: "CreationDate", supplied: true, value: "issued_at", display: false},
        { name: "InvoiceDate", supplied: true, value: "issued_at", display: true, displayName: "Invoice Date"},
        { name: "ExternalApproverID", supplied: false, display: false},
        { name: "DeliveryDate", mandatory: true, supplied: true, value: "issued_at", display: false},
        { name: "Status", supplied: false, display: false},
        { name: "AccountName", supplied: false, display: false},
        { name: "AccountAddress1", supplied: false, display: false},
        { name: "AccountAddress2", supplied: false, display: false},
        { name: "City", supplied: false, display: false},
        { name: "County_State", supplied: false, display: false},
        { name: "Country", supplied: false, display: false},
        { name: "PostCode", supplied: false, display: false},
        { name: "DeliveryAccountName", supplied: false, display: false},
        { name: "DeliveryAccountAddress1", supplied: false, display: false},
        { name: "DeliveryAccountAddress2", supplied: false, display: false},
        { name: "DeliveryCity", supplied: false, display: false},
        { name: "DeliveryCounty_State", supplied: false, display: false},
        { name: "DeliveryCountry", supplied: false, display: false},
        { name: "DeliveryPostCode", supplied: false, display: false},
        { name: "Contact", supplied: false, display: false},
        { name: "AuthorUserID", supplied: false, display: false},
        { name: "Phone", supplied: false, display: false},
        { name: "Notes", supplied: true, value: "notes", display: true, displayName:"Notes"},
        { name: "DiscountRate", supplied: false, display: false},
        { name: "ForCollection", supplied: false, display: false},
        { name: "ExchangeRate", supplied: false, display: false},
        { name: "UseAccountTaxCode", supplied: false, default:true, defaultValue: { set:"true" } },
        { name: "OrderID", supplied: false, display: false},
        { name: "OrderNumber", supplied: true, value: "purchase_order", display: true, displayName:"Purchase Order"},
        { name: "DepartmentID", supplied: false, display: false},
        { name: "Hold", supplied: false, display: false},
        { name: "Ledger", supplied: false, display: false},
        { name: "RowVersionNumber", supplied: "never", display: false},
        { name: "IsPrinted", supplied: false, display: false},
        { name: "AccountBranchID", supplied: false, display: false},
        { name: "OrderDate", supplied: true, value: "issued_at", display: true, displayName: "Invoice Date"},
        { name: "ExcludeFromPrinting", supplied: false, display: false},
        { name: "Type", supplied: false, display: false},
        { name: "SalesRepresentativeID", supplied: false, display: false},
        { name: "LockUser", supplied: "never", display: false},
        { name: "NetAmount", mandatory: true, supplied: true, value: "amount", display: true, displayName: "Net Amount"},
        { name: "TaxAmount", mandatory: true, supplied: true, value: "tax_amount", display: false},
        //{ name: "GrossAmount", supplied: true, value: "amount + tax_amount", display: false},
        { name: "BCNetAmount", supplied: false, display: false},
        { name: "BCTaxAmount", supplied: false, display: false},
	//{ name: "BCGrossAmount", supplied: true, value: "amount + tax_amount", display: false},
        { name: "updateStatus", display:true, displayName: "Message"},
        { name: "lineCount", display:true, displayName: "No Lines"},
      ],
      lineValues : [
        { name: "InvoiceItemID", supplied: false, display: false},
        { name: "InvoiceID", supplied: false, display: false},
        { name: "OrderItemID", supplied: false, display: false},
        { name: "StockItemID", supplied: true, value:"kind", display: true, displayName: "Item Code", map:true, validate: {"exists":true, "ignoreCase":true, getFromApi:true} },
        { name: "StockItemDescription", supplied: true, value:"description", display: true, displayName:"Line Description" },
        { name: "InvoicedQuantity", supplied: true, value:"quantity", display: true, displayName: "Qty."},
        { name: "DeliveredQuantity", supplied: false, display: false},
        { name: "StockItemCost", supplied: false, display: false},
        { name: "StockItemPrice", supplied: true, value:"unit_price", display: true, displayName: "Price" },
        { name: "DiscountRate", supplied: false, default:true, defaultValue: { set:"0" }, display: false},
        { name: "ActualPrice", supplied: false, display: false},
        { name: "TaxCode", supplied: false, display: false},
        { name: "TaxRate", supplied: false, display: false},
        { name: "NetAmount", supplied: true, value:"amount", display: true, displayName: "Net Amount"},
        { name: "TaxAmount", supplied: false, default:true, defaultValue: { set:"0" }, display: false },
        { name: "GrossAmount", supplied: false, display: false},
        { name: "LocationID", supplied: false, display: false, default:true, defaultValue: { getFromValidation:true, getFromObject: "StockItemID", getObjectName: 'DefaultLocationID'  }},
        { name: "SublocationID", supplied: false, display: false, default:true, defaultValue: { getFromValidation:true, getFromObject: "StockItemID", getObjectName: 'DefaultSublocationID' }},
        { name: "OpeningStockGLAccountCode", supplied: false, default:true, defaultValue: { getFromValidation:true, getFromObject: "StockItemID", getObjectName: 'OpeningStockGLAccountCode' }, display: true, displayName: 'open GL Account'},	  
        { name: "GLAccountCode", supplied: false, default:true, defaultValue: { getFromValidation:true, getFromObject: "StockItemID", getObjectName: 'DefaultSalesGLAccountCode' },  display: false},
        { name: "CreationDate", supplied: false, display: false},
        { name: "Notes", supplied: true, value: "project.notes", display: true, displayName: "Project Notes"},
        { name: "Notes2", supplied: false, display: false},
        { name: "AdditionalCost", supplied: false, display: false},
        { name: "DeliveryItemID", supplied: false, display: false},
        { name: "DepartmentID", supplied: true, value:"project.code", display: true,  displayName: "Department" , validate: {"exists":true}},
        { name: "RowVersionNumber", supplied: false, display: false},
        { name: "updateStatus", display:true, displayName: "Message"},
      ],
    },
  },
   {
    type: { "clientName": "axios", "type": "AxiosHarvestExpenses", "displayName": "Axios Harvest Expenses Purchase Invoices", "feedType": "api-harvest",
    configuredEnvironments: [ "vis5202", "axi1732", "axi1731", "axi1003" ],
      // filters name must be valid for the API that you are pushing them at
      // so Harvest supports "to" and "from" in the API call to list invoices
      loadDataFilters: [ 
        { name: "from", type: "date", required: true, label: "Expenses From: " },
        { name: "to", type: "date", required: true, label: "Expenses To: " }
      ]
    },
    processRules: {
      loadFrom: "harvestExpensesApi",
      additionalEnvAllowed: true,
      additionalEnvIdentifier: true,
      processScript: "./clients/axios/scripts/processData",
      updateDataScript: "/shared/updateData",
      loadDataScript: "/shared/loadData",
      transactionType: "SaveItemInvoice",
      transactionTemplate: "GetNewPurchasesInvoice",
      negativeTransactionType: {"allow":false},
      asyncLimit: 1,
    },
    callbackRules: {"allowed":true, "script": "callbackHarvest",  "onLines":true, "callbackFunction": "harvestExpensesApi", "apiFunction": "Expenses", "apiFieldName":"notes", "method":"update", "options": { "id":"callbackID", "value":"UPDATED_AIQ", "object": "line.StockItemDescription" } },
    // we can create Credit Notes from the SaveItemInvoice ... 
    // negativeTransactionType: {"allow":false, transactionType: "SaveItemInvoice", transactionTemplate: "GetNewSalesCreditNote", identifyBy: "NetAmount" },
    //apiFilters: [ { name: "status", loop: true, value:["sent", "paid" ] } ],
    clientSettings: {
      hasLines: true,
      headerValues : [
        { "name":"EnvironmentIdentifier", "supplied": false, "suppliedFromMappedData": true, mappedObject:"SupplierCode", mappedProperty:"Department", "display":true, "displayName": "Environment"},
	{ name: "InvoiceID", supplied: "never", display: false},
	{ name: "SupplierCode", mandatory: true, supplied: true, value: "email", display: true, displayName: "Supplier Code", map:true, mapAdditionalProperty: true, mapAdditionalValues:"Department", validate: {"exists":true, "ignoreCase":true, getFromApi:true }},
	{ name: "AreaID", supplied: false, display: false},
	{ name: "CurrencyCode", mandatory: true, supplied: false, display:true, displayName:"Currency", default:true, defaultValue: { set:"USD" }, validate: {"exists":false }},
	{ name: "CurrrencyCode", mandatory: true, supplied: false, display:true, displayName:"Currency2", default:true, defaultValue: { set:"USD" } },
	{ name: "CurrrencyCode", supplied: "never", display: false},
	{ name: "AccountTaxCode", supplied: false, display: true, displayName: 'Ac Tax Code', default:true, defaultValue: { getFromValidation:true, getFromObject: "SupplierCode", getObjectName: 'DefaultTaxCode' }},
	{ name: "PaymentMethodID", supplied: false, display: false},
	{ name: "ShipmentViaID", supplied: false, display: false},
	{ name: "InvoiceNumber", mandatory: true, supplied: false, default:true, display: true, displayName: "Invoice Number", defaultValue: { set:"ExpensesPeriod" }, validate: {"exists":false}},
	{ name: "ExternalReference", mandatory: true, supplied: false, default:true, display: true, displayName: "External Reference", defaultValue: { set:"Expenses for Period" }, validate: {"exists":false}},
	{ name: "CreationDate", supplied: false, default:true, defaultValue: { set:"setDateToToday" }, display: false},
	{ name: "InvoiceDate", supplied: false, default:true, defaultValue: { set:"setDateToToday" }, display: true, displayName: "Invoice Date"},
	{ name: "ExternalApproverID", supplied: false, display: false},
	{ name: "DeliveryDate", mandatory: true, supplied: false, default:true, defaultValue: { set:"setDateToToday" }, display: true },
	{ name: "Status", supplied: false, display: false},
	{ name: "AccountName", supplied: false, display: false},
	{ name: "AccountAddress1", supplied: false, display: false},
	{ name: "AccountAddress2", supplied: false, display: false},
	{ name: "City", supplied: false, display: false},
	{ name: "County_State", supplied: false, display: false},
	{ name: "Country", supplied: false, display: false},
	{ name: "PostCode", supplied: false, display: false},
	{ name: "DeliveryAccountName", supplied: false, display: false},
	{ name: "DeliveryAccountAddress1", supplied: false, display: false},
	{ name: "DeliveryAccountAddress2", supplied: false, display: false},
	{ name: "DeliveryCity", supplied: false, display: false},
	{ name: "DeliveryCounty_State", supplied: false, display: false},
	{ name: "DeliveryCountry", supplied: false, display: false},
	{ name: "DeliveryPostCode", supplied: false, display: false},
	{ name: "Contact", supplied: false, display: false},
	{ name: "AuthorUserID", supplied: false, display: false},
	{ name: "Phone", supplied: false, display: false},
	{ name: "Notes", supplied: true, value: "notes", display: true, displayName:"Notes"},
	{ name: "DiscountRate", supplied: false, display: false},
	{ name: "ForCollection", supplied: false, display: false},
	{ name: "ExchangeRate", supplied: false, display: false},
	{ name: "UseAccountTaxCode", supplied: false, default:true, defaultValue: { set:"true" } },
	{ name: "OrderID", supplied: false, display: false},
	{ name: "OrderNumber", supplied: true, value: "purchase_order", display: true, displayName:"Purchase Order"},
	{ name: "DepartmentID", supplied: false, display: false},
	{ name: "Hold", supplied: false, display: false},
	{ name: "Ledger", supplied: false, display: false},
	{ name: "RowVersionNumber", supplied: "never", display: false},
	{ name: "IsPrinted", supplied: false, display: false},
	{ name: "AccountBranchID", supplied: false, display: false},
	{ name: "OrderDate", mandatory: true, supplied: false, default:true, defaultValue: { set:"setDateToToday" }, display: true, displayName: "Order Date" },
	{ name: "ExcludeFromPrinting", supplied: false, display: false},
	{ name: "Type", supplied: false, display: false},
	{ name: "SalesRepresentativeID", supplied: false, display: false},
	{ name: "LockUser", supplied: "never", display: false},
	{ name: "NetAmount", mandatory: true, supplied: true, value: "amount", display: true, displayName: "Net Amount"},
	{ name: "TaxAmount", mandatory: true, supplied: true, value: "tax_amount", display: false},
	//{ name: "GrossAmount", supplied: true, value: "amount + tax_amount", display: false},
	{ name: "BCNetAmount", supplied: false, display: false},
	{ name: "BCTaxAmount", supplied: false, display: false},
	//{ name: "BCGrossAmount", supplied: true, value: "amount + tax_amount", display: false},
        { name: "updateStatus", display:true, displayName: "Message"},
        { name: "lineCount", display:true, displayName: "No Lines"},
      ],
      lineValues : [
        { name: "callbackID", supplied: true, display: true, displayName:"Expense ID", value:"id" },
        { name: "InvoiceItemID", supplied: false, display: false},
        { name: "InvoiceID", supplied: false, display: false},
        { name: "OrderItemID", supplied: false, display: false},
        { name: "StockItemID", supplied: true, value:"expenseCategory.name + ':' + line.billable", display: true, displayName: "Item Code", map:true, validate: {"exists":true, "ignoreCase":true, getFromApi:true} },
        { name: "StockItemDescription", supplied: true, value:"notes", display: true, displayName:"Line Description" },
        { name: "InvoicedQuantity", supplied: true, value:"units", display: true, displayName: "Qty."},
        { name: "DeliveredQuantity", supplied: false, display: false},
        { name: "StockItemCost", supplied: false, display: false},
        { name: "StockItemPrice", supplied: true, value:"total_cost / line.units", display: true, displayName: "Price" },
        { name: "DiscountRate", supplied: false, default:true, defaultValue: { set:"0" }, display: false},
        { name: "ActualPrice", supplied: false, display: false},
        { name: "TaxCode", supplied: false, display: true, displayName:"Tax Code", validate: {"exists":true }},
        { name: "TaxRate", supplied: false, display: true, displayName:"Tax Rate", default:true, defaultValue: { getFromValidation:true, getFromObject: "TaxCode", getObjectName: 'Rate'  }},
        { name: "NetAmount", supplied: true, value:"total_cost", display: true, displayName: "Net Amount"},
        { name: "TaxAmount", supplied: false, display:true, displayName: "Tax Amount", calculate:true, calculateRule: "line.NetAmount * line.TaxRate" },
        { name: "GrossAmount", supplied: false, display: false},
        { name: "LocationID", supplied: false, display: false, default:true, defaultValue: { getFromValidation:true, getFromObject: "StockItemID", getObjectName: 'DefaultLocationID'  }},
        { name: "SublocationID", supplied: false, display: false, default:true, defaultValue: { getFromValidation:true, getFromObject: "StockItemID", getObjectName: 'DefaultSublocationID' }},
        { name: "CreationDate", supplied: false, display: false},
        { name: "Notes", supplied: true, value: "spent_at", display: true, displayName: "Notes"},
        { name: "Notes2", supplied: false, display: false},
        { name: "AdditionalCost", supplied: false, display: false},
        { name: "GLAccountCode", supplied: false, default:true, defaultValue: { getFromValidation:true, getFromObject: "StockItemID", getObjectName: 'DefaultPurchasesGLAccountCode' },  display: true, displayName:'GL Account Code'},
        { name: "OpeningStockGLAccountCode", supplied: false, default:true, defaultValue: { getFromValidation:true, getFromObject: "StockItemID", getObjectName: 'OpeningStockGLAccountCode' }, display: true, displayName: 'open GL Account'},
        { name: "DeliveryItemID", supplied: false, display: false},
        { name: "DepartmentID", supplied: true, value:"project.code.toUpperCase()", display: true,  displayName: "Department" , validate: {"exists":true}},
        { name: "RowVersionNumber", supplied: false, display: false},
        { name: "updateStatus", display:true, displayName: "Message"},
      ],
    },
  },
 ];
 exports.creds = {
	returnURL: "http://localhost:3000/auth/openid/return",
 	identityMetadata: "https://login.microsoftonline.com/common/.well-known/openid-configuration", // For using Microsoft you should never need to change this.
        clientID: "e641159a-2a8a-4909-adfd-7e017a0cb617",
        clientSecret: "F4HU7khLw5amoMnEm8NYMUuilfhhjxRaNWC4kWyO8gU=",
 	skipUserProfile: true, // for AzureAD should be set to true.
 	responseType: "id_token", // for login only flows use id_token. For accessing resources use `id_token code`
 	responseMode: "query", // For login only flows we should have token passed back to us in a POST
 	validateIssuer: false,
 	//scope: ["email", "profile"] // additional scopes you may wish to pass
 };
