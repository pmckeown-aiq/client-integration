var _ = require('lodash');
var fs = require("fs-extra");
var path = require('path');
var appDir = path.dirname(require.main.filename);

module.exports = {
  // Get the codes for mapping data from source to accountsIQ
  loadMap: function(options, cb) {
    console.log('CAN MANAGEMAP SEE ' + JSON.stringify(options));
    var mapFileName = options.data.name + '.map.json';
    var clientName = options.data.clientName.replace(/"/g,"");
    var coID = options.data.coID.replace(/"/g,"");

    var file = path.join(appDir + '/clients/' + clientName + '/data/' + coID + '/' + mapFileName);
    if (fs.existsSync(file)) {
      console.log('GOT ' + file);
      var map = require(file);
      console.log(map);
      cb(map)
    } else {
      console.log('Not able to load '+ file + ' data file');
    }
  },
  // Update the codes for mapping data from source to accountsIQ
  updateMap: function(options, cb) {
    console.log('MANAGE MAP OPTIONS ' + JSON.stringify(options));
    var mapFileName = options.data.name.replace(/"/g,"") + ".map.json";
    var clientName = options.data.clientName.replace(/"/g,"");
    var coID = options.data.coID.replace(/"/g,"");
    var file = path.join(appDir + '/clients/' + clientName + '/data/' + coID + '/' + mapFileName);
    if (fs.existsSync(file)) {
      if ( typeof options.mapData !== 'undefined' ) {
        if ( typeof options.mapData.data !== 'undefined' ) {
          if ( options.mapData.data.length > 0 ) {
            options.mapData.data.forEach(function(line) {
	      delete line.$$hashKey;
	    })
            console.log('GOT ' + file + ' - going to write - ' + JSON.stringify(options.mapData));
            fs.writeFile(file, JSON.stringify(options.mapData), function(err) {
              if (err) throw err;
              cb(null, 'file saved'); 
            });
          } else {
	    cb(new Error("updateMap error for " + mapFileName + " options.mapData.data.length is not greater than zero"),null)
          }
        } else {
	  cb(new Error("updateMap error for " + mapFileName + " options.mapData.data is not defined"),null)
        }
      } else {
	cb(new Error("updateMap error for " + mapFileName + " options.mapData is not defined"),null)
      }
    } else {
      cb(new Error("updateMap error for " + mapFileName + " Not able to open "+ file),null)
    }
  }
}
