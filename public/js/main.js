// initiate the app - ui.bootstrap is used for pop up form modals
var app = angular.module('accountsIQIntegrationModule', ['ui.bootstrap','ngTableToCsv','ngJsonExportExcel']);

// Used for paging results
app.filter('offset', function() {
  return function(input, start) {
    start = parseInt(start, 10);
    return input.slice(start);
  };
});

app.directive('fileModel', ['$parse', function ($parse) {
    return {
	require:'ngModel',
        restrict: 'A',
        link: function(scope, element, attrs,ngModel) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
		    ngModel.$setViewValue(element.val());
                    ngModel.$render();
                });
            });
        }
    };
}]);

app.service('$fileUpload', ['$http', function ($http) {
    this.uploadFile = function(file, uploadUrl, coID, type, clientName, feedType, loadDataFilters, objectsToValidate ){
        var fd = new FormData();
	  if (feedType == 'csv') {
           fd.append('file', file);
	  }
          fd.append('coID', coID);
          fd.append('type', type);
          fd.append('clientName', clientName);
          fd.append('feedType', feedType);
          fd.append('loadDataFilters', JSON.stringify(loadDataFilters));
          fd.append('objectsToValidate', JSON.stringify(objectsToValidate));
	    
          $http.post(uploadUrl, fd, {
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined}
          })
          .success(function(){
  		console.log('Success');
          })
          .error(function(){
  		console.log('Failed');
          });
    }
}]);

// Service to track and update stages. Need across the controllers used ..
app.service('manageStages', function() {
  // private variable
  var _currentStage = {};

  this.setCurrentStage = function(stage) {
     _currentStage = stage;
    console.log('Current Stage' +  _currentStage);
    return  _currentStage;
  }
  this.getCurrentStage = function(stage) {
    return  _currentStage;
  }
})

// Controller for the nav bar ... holds the currentStage to control menu appearance
app.controller('navBar',  ['$scope', '$rootScope', 'manageStages', function($scope, $rootScope, manageStages) {
  // Simple controller for the "stages" bar ... just watch for the current stage set by the main controllers
  $scope.$watch(function() { return manageStages.getCurrentStage(); }, function(stage) {
    console.log("New Data", stage);
    $scope.currentStage = stage;
  },true);

  // Calls out of this controller (the header) drop down menu to the main controllers
  $scope.loadManageMap = function() {
    $rootScope.$emit("CallLoadManageMap", {});
  }
  $scope.loadStatusTable = function() {
    $rootScope.$emit("CallLoadLogInfo", {});
  }
  $scope.loadConfig = function() {
    $rootScope.$emit("CallLoadConfig", {});
  }
}]);

// Controller for the "step wizard" - the status bar showing the current stage
app.controller('stepWizard',  ['$scope', 'manageStages', function($scope, manageStages) {
  // Simple controller for the "stages" bar ... just watch for the current stage set by the main controllers
  $scope.$watch(function() { return manageStages.getCurrentStage(); }, function(stage) {
    console.log("New Data", stage);
    $scope.currentStage = stage;
  },true);
}]);

app.controller('getConfig',  ['$scope', '$fileUpload', '$http', 'manageStages', function($scope, $fileUpload, $http, manageStages) {
    // function to emulate the setCurrentStage service - allows it to be called in the current scope
    $scope.setCurrentStage = function(stage) {
       $scope.currentStage = manageStages.setCurrentStage(stage);
    };
    // initialise the form 
    $scope.setConfigForm = {};
    $http({ method: 'POST',
            url: '/getConfig'
         }).then(function (response){
            $scope.coIDs = response.data.coIDs;
            $scope.types = response.data.types;
         }, function (error) {});

   $scope.setConfig = function(setConfig) {
    $scope.coID='';
    $scope.type='';
    $scope.clientName='';
    $scope.feedType='';
    $scope.loadDataReady=false;
    $scope.loadFile=false;
    var file = $scope.setConfigForm.myFile;
    var coID =  $scope.setConfigForm.coID.replace(/"/g,"");
    // Actually bound to a string that is a JSON object (value of input)
    var formType =  JSON.parse($scope.setConfigForm.type);
    var type =  formType.type.replace(/"/g,"")
    var clientName =  formType.clientName.replace(/"/g,"")
    var feedType =  formType.feedType
    // If the feed is an api - ready for loadData
    if (feedType == 'api' ) {
      $scope.loadDataReady=true;
    }
    // If the feed is an csv - need to upload a file
    if (feedType == 'csv' ) {
      $scope.loadDataReady = false;
      $scope.loadFile = true;
    }
   }; 

   $scope.prepareLoadData = function(prepareLoadData) {
    $scope.file='';
    var file = $scope.setConfigForm.myFile;
    var coID =  $scope.setConfigForm.coID.replace(/"/g,"");
    // Actually bound to a string that is a JSON object (value of input)
    var formType =  JSON.parse($scope.setConfigForm.type);
    var type =  formType.type.replace(/"/g,"")
    var clientName =  formType.clientName.replace(/"/g,"")
    var feedType =  formType.feedType.replace(/"/g,"")
    var loadDataFilters =  formType.loadDataFilters
    var objectsToValidate =  formType.objectsToValidate
    var uploadUrl = "/upload";
    $fileUpload.uploadFile(file, uploadUrl, coID, type, clientName, feedType, loadDataFilters, objectsToValidate);
  };
}]);

app.controller('loadDataWaitPopUpController',function ($scope, $uibModalInstance) {
  $scope.ok = function () {
    console.log('Closing form loadDataWait');
    $uibModalInstance.close();
  };
  // Cancel
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

app.controller('serverErrorPopUpController',function ($scope, $uibModalInstance) {
  $scope.ok = function () {
    console.log('Closing form serverErrorPopUp');
    $uibModalInstance.close();
  };
  // Cancel
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});


app.controller('processDataWaitPopUpController',function ($scope, $uibModalInstance) {
  $scope.ok = function () {
    console.log('Closing form processDataWait');
    $uibModalInstance.close();
  };
  // Cancel
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

app.controller('TransactionLinesPopUpController',function ($scope, $uibModalInstance, transaction) {
  $scope.transaction = transaction;
  //console.log('In pop up controller ' + JSON.stringify(transaction))
  // Close the pop up (save changes
  $scope.ok = function () {
    console.log('Closing form' + JSON.stringify($scope.transaction));
    $uibModalInstance.close();
  };
  // Cancel
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

app.controller('UpdateStagesStatusPopUp',function ($scope, $uibModalInstance, transaction) {
  $scope.transaction = transaction;
  //console.log('In pop up controller ' + JSON.stringify(transaction))
  // Close the pop up (save changes
  $scope.ok = function () {
    console.log('Closing form' + JSON.stringify($scope.transaction));
    $uibModalInstance.close();
  };
  // Cancel
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

app.controller('AccountIDPopUpController',function ($scope, $uibModalInstance, invalidItem) {
  $scope.invalidItem = invalidItem;
  //console.log('In pop up controller ' + JSON.stringify(invalidItem))
  // Close the pop up (save changes
  $scope.ok = function () {
    console.log('Closing form' + JSON.stringify($scope.invalidItem));
    // Allow the item to be created by setting haveConfigured to true ...
    invalidItem.haveConfigured = true;
    $uibModalInstance.close();
  };
  $scope.getDetails= function (object) {
    $scope.getFromApi({invalidItem})
  };
  // Cancel
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

app.controller('DepartmentIDPopUpController',function ($scope, $uibModalInstance, invalidItem) {
  $scope.invalidItem = invalidItem;
  //console.log('In pop up controller ' + JSON.stringify(invalidItem))
  // Close the pop up (save changes
  $scope.ok = function () {
    console.log('Closing form' + JSON.stringify($scope.invalidItem));
    // Allow the item to be created by setting haveConfigured to true ...
    invalidItem.haveConfigured = true;
    $uibModalInstance.close();
  };
  $scope.getDetails= function (object) {
    console.log('Fetching from ' + JSON.stringify($scope.invalidItem));
    console.log('Fetching from ' + JSON.stringify(object.type));
    console.log('Fetching from ' + JSON.stringify(object.apiId));
    $scope.getFromApi({invalidItem})
  };
  // Cancel
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

app.controller('StockItemIDPopUpController',function ($scope, $uibModalInstance, invalidItem) {
  $scope.invalidItem = invalidItem;
  //console.log('In pop up controller ' + JSON.stringify(invalidItem))
  // Close the pop up (save changes
  $scope.ok = function () {
    console.log('Closing form' + JSON.stringify($scope.invalidItem));
    // Allow the item to be created by setting haveConfigured to true ...
    invalidItem.haveConfigured = true;
    $uibModalInstance.close();
  };
  $scope.getDetails= function (object) {
    $scope.getFromApi({invalidItem})
  };
  // Cancel
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

app.controller('ManageMapDataPopUpController',function ($scope, $uibModalInstance, mapData) {
  $scope.mapData = mapData;
  console.log('In pop up controller mapData ' + JSON.stringify(mapData))
  // Close the pop up (save changes
  $scope.ok = function () {
    // Check for and add new data ...
    if (angular.isDefined($scope.newRecord.sourceValue) && $scope.newRecord.sourceValue != '' && $scope.newRecord.aiqValue != '') {
      var newRecord = {};
      for (var key in $scope.newRecord) {
        if ($scope.newRecord.hasOwnProperty(key)) {
	  console.log
          newRecord[key] = $scope.newRecord[key];
        }
      }
      // ADD A NEW ELEMENT.
      mapData.mapData.data.push( newRecord );
      $scope.mapData = mapData;
    }
    console.log('Closing form ManageMapData' + JSON.stringify(mapData));
    //$uibModalInstance.close(mapData);
    $uibModalInstance.close(mapData);
  };
  // Cancel
  $scope.cancel = function () {
    $uibModalInstance.dismiss('cancel');
  };
});

app.controller('updateController', function ($scope, $rootScope, $uibModal, socket, manageStages) {
    // function to emulate the setCurrentStage service - allows it to be called in the current scope
    $scope.setCurrentStage = function(stage) {
       $scope.currentStage = manageStages.setCurrentStage(stage);
    };

    // Loading of the data mapping is called from the menu - in a different controller - so need to monitor the rootScope to see when it was called
    $rootScope.$on("CallLoadManageMap", function(){
      $scope.showManageMap = true; 
    });
    $rootScope.$on("CallLoadLogInfo", function(){
      $scope.showLogInfo = true; 
    });
	
    // initialise the form 
    $scope.loadFileForm = {};

    $scope.createInvalidItem = [];
    $scope.createTransactions = [];
    // Bit of a hack - remove array item if click on buton to enact (createAccounts)
    $scope.remove = function(array, index){
      array.splice(index, 1);
    }

    // Array for messages
    $scope.status = [];
    // server error variable watch to check for changes
    $scope.serverError = [];
    $scope.$watchCollection('serverError', function() {
	if ($scope.serverError.length > 0 ) {
          console.log('serverError has changed!');
          $scope.showServerError();
	}
    });
    $scope.invalidData = [];

    $scope.feedTransactions = [];
    $scope.feedErrors = [];

    $scope.createdTransactions = [];
    $scope.wroteBackTransactions = [];

    $scope.controlTotals = [];

    $scope.getDefaultsResult = [];

    $scope.filters = {};

    $scope.loadData = function (loadFileForm) {
	// As missing accounts come in and append - if loadData again clear array - avoid duplicate accounts
	// TODO need to be smart dealing with dates/dynamic form from server config!
	// if feedtype == Harvest and type is date then it expects YYYYMMDD - form will have it as YYYY-MM-DD
	var clientName = $scope.clientName.replace(/"/g,""); // replace quotes if there!
    console.log('DATAMYFILTERS ' + JSON.stringify($scope.loadDataFilters));
        if ( $scope.loadDataFilters ) {
        if ( $scope.loadDataFilters.length > 0 ) {
          $scope.loadDataFilters.forEach(function(filter) {
            console.log('DATAMYFILTER ' + JSON.stringify(filter));
            if ( filter.type == 'date' ) {
              var myName = filter.name;
              // undo the timezone adjustment we did during the formatting
              filter[myName].setMinutes(filter[myName].getMinutes() - filter[myName].getTimezoneOffset());
              console.log('DATAMYFILTER VALIE IS ' + filter[myName] );
	    }
          })
        }
        }
        console.log('DATAMYFILTERS ' + JSON.stringify($scope.loadDataFilters));
	var feedType = $scope.feedType.replace(/"/g,""); // replace quotes if there!
        socket.emit('loadData', { 'file' : $scope.file , 'logFileName' : $scope.logFileName , 'coID' : $scope.coID , 'type' : $scope.type , 'clientName': $scope.clientName, 'feedType' : $scope.feedType, 'loadDataFilters': $scope.loadDataFilters});
    };

    // Revalidate Data - when codes found to be missing, allow user to re-extract the static data and then re-validate ones in error
    $scope.revalidate = function () {
        socket.emit('extractStaticData', { 'coID' : $scope.coID, 'clientName' : $scope.clientName, 'type' : $scope.type });
	// try to hide the transaction table
	//$scope.dataUpdateRunning = true;
    };

    $scope.createTransactions = function () {
      // strip off double quotes from callbackRules
      $scope.callbackRules = JSON.parse($scope.callbackRules)
      $scope.createdTransactionCount = 0;
      $scope.failedTransactionCount = 0;
      $scope.wroteBackTransactionCount = 0;
      socket.emit('createTransactions', { transactions : $scope.feedTransactions, coID : $scope.coID, type : $scope.type });
      // try to hide the transaction table
      $scope.dataUpdateRunning = true;
    };

      $scope.getFromApi = function (element) {
        socket.emit('getFromApi', { coID : $scope.coID , type : $scope.type , element });
      };

      // Pop up for serverErrors - error messages from the server ...
      $scope.showServerError = function (serverError) {
        var modalInstance = $uibModal.open({
          templateUrl: 'serverErrorPopUp.html',
	  scope: $scope,
	  // disable click on back ground to dismiss
	  backdrop: 'static',
          controller: 'serverErrorPopUpController',
	  size: 'lg',
          resolve: {
            serverError: function () {
              //return $scope.items;
	      return 'complete';
            }
          }
        });
        modalInstance.result.then(function () {
          $scope.serverErrorShown = true;
        }, function () {
        });
      };

      // Pop up for loadData Waiting / Processing
      $scope.showLoadDataWait = function (feedTransactionsLength) {
        var modalInstance = $uibModal.open({
          templateUrl: 'loadDataWaitPopUp.html',
	  scope: $scope,
	  // disable click on back ground to dismiss
	  backdrop: 'static',
          controller: 'loadDataWaitPopUpController',
	  size: 'lg',
          resolve: {
            dataLoading: function () {
              //return $scope.items;
	      return 'complete';
            }
          }
        });
        modalInstance.result.then(function () {
          $scope.feedTransactionsLoaded = true;
	  $scope.setCurrentStage(4);
        }, function () {
        });
      };

      // Pop up for processData Waiting / Processing
      $scope.showProcessDataWait = function (feedTransactionsLength) {
        var modalInstance = $uibModal.open({
          templateUrl: 'processDataWaitPopUp.html',
	  scope: $scope,
	  // disable click on back ground to dismiss
	  backdrop: 'static',
          controller: 'processDataWaitPopUpController',
	  size: 'lg',
          resolve: {
            dataProcessing: function () {
              //return $scope.items;
	      return 'complete';
            }
          }
        });
        modalInstance.result.then(function () {
          $scope.feedTransactionsProcessed = true;
        }, function () {
        });
      };

      // Transaction Lines Pop Up form
      $scope.openUpdateStagesStatusPopUp= function (transaction) {
        var modalInstance = $uibModal.open({
          templateUrl: 'updateDataStagesPopUp.html',
	  scope: $scope,
          controller: 'UpdateStagesStatusPopUp',
	  size: 'lg',
          resolve: {
            transaction: function () {
              //return $scope.items;
	      return transaction;
            }
          }
        });
        modalInstance.result.then(function () {
          //$scope.transaction = TransactionLinesPopUp.transaction;
        }, function () {
        });
      }

      // Transaction Lines Pop Up form
      $scope.openTransactionLines= function (transaction) {
        var modalInstance = $uibModal.open({
          templateUrl: 'TransactionLinesPopUp.html',
	  scope: $scope,
          controller: 'TransactionLinesPopUpController',
	  size: 'lg',
          resolve: {
            transaction: function () {
              //return $scope.items;
	      return transaction;
            }
          }
        });
        modalInstance.result.then(function () {
          $scope.transaction = TransactionLinesPopUp.transaction;
        }, function () {
        });
      }
      // Invalid Account Pop Up Form
      $scope.openAccountDetails= function (invalidItem, getDefaultsResult) {
        var modalInstance = $uibModal.open({
          templateUrl: 'AccountIDPopup.html',
	  scope: $scope,
          controller: 'AccountIDPopUpController',
          resolve: {
            invalidItem: function () {
              //return $scope.items;
	      return invalidItem;
            }
          }
        });

        modalInstance.result.then(function () {
          $scope.AccountName = AccountIDPopUp.AccountName;
        }, function () {
              console.log('Modal dismissed at: ' + new Date());
        });
      };

      // Invalid Department Pop Up Form
      $scope.openDepartmentDetails= function (invalidItem, getDefaultsResult) {
        var modalInstance = $uibModal.open({
          templateUrl: 'DepartmentIDPopup.html',
	  scope: $scope,
          controller: 'DepartmentIDPopUpController',
          resolve: {
            invalidItem: function () {
              //return $scope.items;
	      return invalidItem;
            }
          }
        });

        modalInstance.result.then(function () {
          $scope.DepartmentName = DepartmentIDPopUp.DepartmentName;
        }, function () {
              console.log('Modal dismissed at: ' + new Date());
        });
      };

      // Invalid StockItem Pop Up Form
      $scope.openStockItemDetails= function (invalidItem, getDefaultsResult) {
        var modalInstance = $uibModal.open({
          templateUrl: 'StockItemIDPopup.html',
	  scope: $scope,
          controller: 'StockItemIDPopUpController',
          resolve: {
            invalidItem: function () {
              //return $scope.items;
	      return invalidItem;
            }
          }
        });

        modalInstance.result.then(function () {
          $scope.StockItemName = StockItemIDPopUp.DepartmentName;
        }, function () {
              console.log('Modal dismissed at: ' + new Date());
        });
      };

      $scope.openManageMapping= function (data) {
	// add the clientName to the data - needed for the path for files
	data.clientName = $scope.clientName;
	data.coID = $scope.coID;
	
	// issue call to server to load the data 
	socket.emit('loadMap', data);
      }
     
      // The data for managing maps is loaded by the call above 
      // Have to wait for the data to return from the server to actually 
      // open the form - create function to be called when it comes back
      $scope.cbOpenManageMapping= function (mapData) {
	console.log('in cbOpenManageMapping');
        var modalInstance = $uibModal.open({
          templateUrl: 'mapDataPopup.html',
          controller: 'ManageMapDataPopUpController',
          resolve: {
            mapData: function () {
              //return $scope.items;
              // Send the data mapData to the server 
	      // change the op first (the operation - which was loadMapData)
	      delete mapData.op;
	      return $scope.mapData;
	  //    return $scope.mapData;
            }
          }
        });

        modalInstance.result.then(function () {
          $scope.mapData = mapData;
	  console.log('then ' + JSON.stringify(mapData));
          socket.emit('updateMap', mapData);
        }, function () {
	      console.log('RETURNED MAP DATA ' + JSON.stringify($scope.mapData));
              console.log('Modal dismissed at: ' + new Date());
        });
      };

 

    $scope.start = function () {
        socket.emit('start');
    };

    $scope.stop = function () {
        socket.emit('stop');
    };

    // Use element to pass a variable to the server
    $scope.GetSalesInvoiceDefaults = function (element) {
        socket.emit('GetSalesInvoiceDefaults', element);
        console.log('emit call to GetSalesInvoiceDefaults'  + JSON.stringify(element));
    };

    $scope.getDefaults = function (ObjectType) {
        socket.emit('getDefaults', { object: ObjectType, coID : $scope.coID , type : $scope.type });
        console.log('emit call to getDefaults', { object:ObjectType, coID : $scope.coID , type : $scope.type });
    };

    // Use element to pass a variable to the server
    $scope.createInvalidItem = function (element) {
        socket.emit('createInvalidItem', { coID : $scope.coID , type : $scope.type , element });
    };

    $scope.viewLines = function (element) {
        socket.emit('viewLines', element);
    };

    socket.on('error', function (data) {
	console.log('Error: ' + JSON.stringify(data));
        $scope.serverError.push(data);
	console.log('Error: ' + JSON.stringify($scope.serverError));
	console.log('Error: ' + JSON.stringify($scope.serverError.length));
    });

    socket.on('status', function (data) {
        $scope.status.push({ text: data.message });
	console.log('statusmessage ' + JSON.stringify(data));
    });

    socket.on('loadDataStatus', function (data) {
	console.log('loadDataStaus ' + JSON.stringify(data.loadDataStatus));
        $scope.loadDataStatus = data.loadDataStatus.message;
    });

    socket.on('coID', function (data) {
	// Set the coID
        $scope.coID = data.coID ;
    });
    socket.on('type', function (data) {
        $scope.type = data.type ;
    });

    socket.on("invalidData", function (data) {
	// Received the invalidData array 
	// if the data for the invalidItem did not get "details" from API need to add details (default name at least ...)
        $scope.invalidData = (data);
        $scope.status.push({text: 'We are missing some reference file data ... please review the invalid data messages' });
	// See if th object valiation rule for this object type has abortRun = true - if it does use scope.abortedRun to disable the "Start Processing" button
	//if ( data.invalidData.result.abortRun == true ) { 
	//  $scope.abortedRun = true;
	//}
	//console.log('Invalid Data is ' + JSON.stringify($scope.invalidData));
    });

    socket.on('getDefaultsResult', function (data) {
        $scope.getDefaultsResult = data.getDefaultsResult;
    });

    socket.on('extractStaticData', function (data) {
        for (var i = 0, l = $scope.objectsToValidate.length; i < l; i++) {
          if ($scope.objectsToValidate[i].name === data.extractStaticData.extract) {
            $scope.objectsToValidate[i].success = data.extractStaticData.success;
            break;
            }
         }
    });

    socket.on('mapData', function (data) {
        $scope.mapData = data;
        console.log('received socket on mapData ... with data ' + JSON.stringify(data));
	// Now open the form - with the data 
	$scope.cbOpenManageMapping($scope.mapData, function(mapData) {
	});
    });

    socket.on('fetchedFromApi', function (data) {
	console.log('Get From Api Returned ' + JSON.stringify(data));
	var objects = $scope.invalidData;
        // loop through invalidData to find the correct "code" 
        for (var i = 0; i < objects.length; i++) {
	    console.log('checking ' + objects[i].code + ' for match ' + data.fetchedFromApi.invalidItem.code);
            if (objects[i].code === data.fetchedFromApi.invalidItem.code) {
                objects[i].data = data.fetchedFromApi.details;
	        console.log('matched ' + objects[i].code + ' set to ' + JSON.stringify(objects[i]) );
                break;
            }
        }
        //$scope.salesInvoiceDefaults = data.salesInvoiceDefaults;
    });

    socket.on('salesInvoiceDefaults', function (data) {
        $scope.salesInvoiceDefaults = data.salesInvoiceDefaults;
    });

    socket.on('createdTransaction', function (data) {
        $scope.createdTransactions.push( data.createdTransaction );
	$scope.createdTransactionCount++;
        console.log('createdTransaction says ' + JSON.stringify(data));
        if ( data.createdTransaction.updateStatus.status != true ) {
	  $scope.failedTransactionCount++;
        }
    });

    socket.on('createdObject', function (data) {
	console.log('createdObject ' + JSON.stringify(data));
        $scope.status.push({ text: 'Created ' + data.createdObject.type + ' ' + data.createdObject.code + ' with status: ' +  data.createdObject.status });
        //$scope.createdTransactions.push( data.createdTransaction );
    });

    socket.on('wroteBack', function (data) {
        $scope.wroteBackTransactions.push(data.wroteBack);
	$scope.wroteBackTransactionCount++;
    });

    socket.on('feedTransactions', function (data) {
	//console.log('Data is ' + JSON.stringify(data));
        $scope.feedTransactions = data.feedTransactions;
	$scope.itemsPerPage = 50;
        $scope.currentPage = 0;
        $scope.prevPage = function() {
        if ($scope.currentPage > 0) {
          $scope.currentPage--;
          }
        $scope.prevPageDisabled = function() {
          return $scope.currentPage === 0 ? "disabled" : "";
        };
        $scope.pageCount = function() {
          return Math.ceil($scope.feedTransactions.length/$scope.itemsPerPage)-1;
        };
        $scope.nextPage = function() {
          if ($scope.currentPage < $scope.pageCount()) {
            $scope.currentPage++;
          }
        };

        $scope.nextPageDisabled = function() {
          return $scope.currentPage === $scope.pageCount() ? "disabled" : "";
        };
	$scope.feedCols = Object.keys($scope.feedTransactions[0]);
        $scope.hasLines = data.opts.hasLines;
	// we are only displaying supplied header and line balues
        $scope.displayHeaderValues = data.opts.displayHeaderValues;
        $scope.headerValues = data.opts.headerValues;
	if ( $scope.hasLines == true ) { 
          $scope.displayLineValues = data.opts.displayLineValues;
          $scope.lineValues = data.opts.lineValues;
        };
      };
    });

    socket.on('feedErrors', function (data) {
	console.log('Invalid Transactions is ' + JSON.stringify(data.feedErrors));
        $scope.feedErrors = data.feedErrors;
	if ( $scope.feedErrors.length > 0 ) {
	  $scope.feedCols = Object.keys($scope.feedErrors[0]);
        }
	console.log('feed cols is ' + JSON.stringify($scope.feedCols));
        $scope.hasLines = data.opts.hasLines;
	// we are only displaying supplied header and line balues
        $scope.displayHeaderValues = data.opts.displayHeaderValues;
        $scope.headerValues = data.opts.headerValues;
    	console.log('display cols' + JSON.stringify($scope.displayHeaderValues));
	console.log('has lines ' + JSON.stringify($scope.hasLines));
	if ( $scope.hasLines == true ) { 
          $scope.displayLineValues = data.opts.displayLineValues;
          $scope.lineValues = data.opts.lineValues;
	  console.log('display line cols' + JSON.stringify($scope.displayLineValues));
        };
    });


    socket.on('controlTotals', function (data) {
	console.log(JSON.stringify(data));
        $scope.controlTotals = data.controlTotals;
    });

    socket.on('loadDataReady', function (data) {
	console.log('Processing ' + JSON.stringify(data));
        $scope.file = JSON.stringify(data.file).replace(/"/g,"");
        // might not have a danger property (file exists)
        if ( typeof data.danger !== 'undefined' ) {
          $scope.danger = JSON.stringify(data.danger).replace(/"/g,"");
        }
        $scope.logFileName = JSON.stringify(data.logFileName);
        $scope.coID = JSON.stringify(data.coID).replace(/"/g,"");
        $scope.type = JSON.stringify(data.type).replace(/"/g,"");
        $scope.clientName = JSON.stringify(data.clientName);
        $scope.feedType = JSON.stringify(data.feedType).replace(/"/g,"");
        $scope.loadDataReady = JSON.stringify(data.loadDataReady);
	$scope.setCurrentStage(3);
        $scope.clientSettings = JSON.stringify(data.clientSettings);
	if ( data.callbackRules !== 'undefined' ) {
          $scope.callbackRules = JSON.stringify(data.callbackRules);
        } else {
          $scope.callbackRules = {};
	}
	if ( data.loadDataFilters !== 'undefined' ) {
          $scope.loadDataFilters = JSON.parse(data.loadDataFilters);
        } else {
	  // may not have any filters to load
          $scope.loadDataFilters = {};
        }
	if ( data.objectsToMap !== 'undefined' ) {
          $scope.objectsToMap = data.objectsToMap;
        } else {
	  // may not have any objects to validate
          $scope.objectsToMap = {};
        }
	    console.log('objectsToMap ' +  JSON.stringify(data.objectsToMap));
	if ( data.objectsToValidate !== 'undefined' ) {
          $scope.objectsToValidate = data.objectsToValidate;
        } else {
	  // may not have any objects to validate
          $scope.objectsToValidate = {};
        }
	console.log('Start the static data extract ' + JSON.stringify(data.objectsToValidate));
	
	// data.objectsToValidate lists the calls that will be made to extract static data from the server
	data.objectsToValidate.forEach(function(objectToValidate) {
	  objectToValidate.called = true;
	  objectToValidate.extracted = false;
	})
        socket.emit('extractStaticData', { 'coID' : $scope.coID, 'clientName' : $scope.clientName, 'type' : $scope.type });
    });
});

app.factory('socket', function ($rootScope) {
    var socket = io.connect();
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            });
        }
    };
});
