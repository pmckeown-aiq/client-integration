var Q = require('Q');
var path = require('path');
var _ = require('lodash');
var fs = require("fs");

function findAndReplace(arr, find, replace) {
  let i;
  for(i=0; i < arr.length && arr[i].id != find.id; i++) {}
  i < arr.length ? arr[i] = replace : arr.push(replace);
}

module.exports = mapObject = function(mapObjects, feedTransactionArray, cb) {
  var appDir = path.dirname(require.main.filename);
  // need this for the path to the data file
  var clientName = mapObjects.clientName;
  var coID = mapObjects.coID;
  // read the map files for all the objects to be mapped 
  mapObjects.forEach(function(mapObject) {
    var mapWhat = mapObject.name;
    var mapFiles = {} 
    if (fs.existsSync(appDir + '/clients/' + clientName + '/data/' + coID + '/' + mapWhat + '.map.json')) {
      mapFiles[mapWhat] =  require(appDir + '/clients/' + clientName + '/data/' + coID + '/' + mapWhat + '.map.json');
    } else {
      cb(new Error("File for data mapping does not exist - " + "/clients/" + clientName + "/data/" + coID + "/" + mapWhat + ".map.json"))
    }
    // Extract from the transactions an array of all the values that need to be mapped
    myUniqueArray = _.chain(feedTransactionArray).map(function(item) { return item[mapWhat] }).uniq().value();
    console.log(JSON.stringify(myUniqueArray));
    myUniqueArray.forEach(function(sourceValue) {
      mappedCode = _.filter(mapFiles[mapWhat]['data'], { "sourceValue" : sourceValue });
      if ( mappedCode.length == 1 ) { // can only map if one result! 
        //console.log('update ' + sourceValue + ' with ' + JSON.stringify(mappedCode[0].aiqValue));
      } // end if for mappedCode.length
    });
    feedTransactionArray.forEach(function(transaction) {
      if (mapObject.onLines == false ) { // looking for something on the header
        // the value from the "other" system is transaction[mapObject.name]
	// this may have trailing spaces (Axios / Harvest has one with a space
	// so need to trim before we map ...
	var sourceValue = transaction[mapObject.name];	
        console.log("trim " + transaction[mapObject.name]);
	// only if it is a string ...
	if (typeof sourceValue === 'string' ) {
	  sourceValue = sourceValue.trim();
        }
        var mappedCode = _.filter(mapFiles[mapWhat]['data'], { "sourceValue" : sourceValue });
        // actually returns a one line array - convert to pure JSON
        //console.log(mappedCode.length + ' is what we got back - did we get a match???');
        if ( mappedCode.length == 1 ) {
          var mappedCode = mappedCode[0];    
          console.log(JSON.stringify(mappedCode) + ' is actually the code!');
          //console.log(JSON.stringify(mappedCode.aiqValue) + ' is actually the code!');
	  // if we are to be able to get this transaction from API we need to keep the original (so for AccountID as AccountID_getFromApiValue
          //if ( mapObject.getFromApi == true ) {
	    var saveOld =  mapObject.name + '_getFromApiValue';
            transaction[saveOld] = transaction[mapObject.name];
	    // Check if we have any additional values to be set from the mapped data ... if we do mappedObject.getFromMappedObject will be > 0 
	    if ( mapObject.getFromMappedObject.length > 0 ) { 
              mapObject.getFromMappedObject.forEach(function(extraObject) {
	        transaction[extraObject.name] = mappedCode[extraObject.mappedProperty];
              })
            }
	  //}
	  // and set the value to the transaction ...
	  transaction[mapObject.name] = mappedCode.aiqValue;
          // record the original value - needed for getting from API 
        } else {
          //console.log(mappedCode.length + ' is what we got back - It was not 1 so need an error!');
        }
      }
      if (mapObject.onLines == true ) { // looking for something on the lines
	transaction.lines.forEach(function(line) {
          // the value from the "other" system is transaction[mapObject.name]
	  // this may have trailing spaces (Axios / Harvest has one with a space
	  // so need to trim before we map ...
	  var sourceValue = line[mapObject.name];	
          console.log("trim " + line[mapObject.name]);
	  // only if it is a string ...
	  if (typeof sourceValue === 'string' ) {
	    sourceValue = sourceValue.trim();
          }
          console.log('looking for object ' + mapObject.name + ' from  on header ' + JSON.stringify(mapObject.name));
          console.log(line[mapObject.name]);
          var mappedCode = _.filter(mapFiles[mapWhat]['data'], { "sourceValue" : sourceValue });
          // actually returns a one line array - convert to pure JSON
          console.log(mappedCode.length + ' is what we got back - did we get a match???');
          if ( mappedCode.length == 1 ) {
            var mappedCode = mappedCode[0];    
            //console.log(JSON.stringify(mappedCode) + ' is actually the code!');
            //console.log(JSON.stringify(mappedCode.aiqValue) + ' is actually the code!');
	    // if we are to be able to get this line from API we need to keep the original (so for AccountID as AccountID_getFromApiValue
            if ( mapObject.getFromApi == true ) {
	      var saveOld =  mapObject.name + '_getFromApiValue';
              line[saveOld] = line[mapObject.name];
	    }
	    // and set the value to the transaction ...
	    line[mapObject.name] = mappedCode.aiqValue;
            // record the original value - needed for getting from API 
          } else {
            //console.log(mappedCode.length + ' is what we got back - It was not 1 so need an error!');
          }
        })
      }
    });
  });
  return cb(null,feedTransactionArray);
}
