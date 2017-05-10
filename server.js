'use strict';

var jade = require('jade');
var express = require('express');
var fs = require('fs-extra');

var app = express();

// HTTPS Section 
var https = require('https')
var ports = process.env.NODE_ENV === 'production'
  ? [80, 443]
  : [3442, 3443]
var server = https.createServer(
  {
    key: fs.readFileSync('./tls/key.pem'),
    cert: fs.readFileSync('./tls/cert.pem')
  },
  app
)
// END HTTPS Section 
// HTTP Section 
/* 
var server = require('http').createServer(app);
*/
// END HTTP Section 


var io = require('socket.io').listen(server);
// File upload requirements
// all environments
var path = require('path');

// Express 3.4.0
// File upload requirements
// all environments
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.methodOverride());
app.use(express.urlencoded());
app.use(express.multipart()); //for uploading file
var UniqueNumber = require("unique-number");
var uniqueNumber = new UniqueNumber(true);

app.use('/file-upload', express.static(__dirname + '/node_modules/angular-file-upload/dist/'));
// Required for Express 4 - to be tested
//var favicon = require('serve-favicon');
//var logger = require('morgan');
//var bodyParser = require('body-parser');
//var multer = require('multer');
//var methodOverride = require('method-override');
// File upload requirements
// all environments
//app.use(favicon(__dirname + '/public/favicon.ico'));
//app.use(logger('dev'));
//app.use(bodyParser.json()); 
//app.use(methodOverride());
//app.use(bodyParser.urlencoded({ extended: true }));
//app.use(multer());

// For login stuff from WebApp-OpenIDConnect-HodeJS-master
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var bodyParser = require('body-parser');
var passport = require('passport');
var util = require('util');
var bunyan = require('bunyan');
var config = require('./conf/config')

// Start QuickStart here

var OIDCStrategy = require('passport-azure-ad').OIDCStrategy;

var log = bunyan.createLogger({
    name: 'AccountsIQ Integration'
});


// Passport session setup. (Section 2)

//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.email);
});

passport.deserializeUser(function(id, done) {
  findByEmail(id, function (err, user) {
    done(err, user);
  });
});

// array to hold logged in users
var users = [];

var findByEmail = function(email, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
   log.info('we are using user: ', user);
    if (user.email === email) {
      return fn(null, user);
    }
  }
  return fn(null, null);
};

// Use the OIDCStrategy within Passport. (Section 2) 
// 
//   Strategies in passport require a `validate` function, which accept
//   credentials (in this case, an OpenID identifier), and invoke a callback
//   with a user object.
passport.use(new OIDCStrategy({
    callbackURL: config.creds.returnURL,
    realm: config.creds.realm,
    clientID: config.creds.clientID,
    clientSecret: config.creds.clientSecret,
    oidcIssuer: config.creds.issuer,
    identityMetadata: config.creds.identityMetadata,
    skipUserProfile: config.creds.skipUserProfile,
    responseType: config.creds.responseType,
    responseMode: config.creds.responseMode
  },
  function(iss, sub, profile, accessToken, refreshToken, done) {
    if (!profile.email) {
      return done(new Error("No email found"), null);
    }
    // asynchronous verification, for effect...
    process.nextTick(function () {
      findByEmail(profile.email, function(err, user) {
        if (err) {
          return done(err);
        }
        if (!user) {
          // "Auto-registration"
          users.push(profile);
          return done(null, profile);
        }
        return done(null, user);
      });
    });
  }
));
// end login stuff
// set up the engine
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');

app.use(express.logger());
app.use(express.compress());
app.use(express.static(__dirname + '/public'));

// For login stuff from WebApp-OpenIDConnect-HodeJS-master
//app.set('views', __dirname + '/views');
//app.set('view engine', 'ejs');
//app.use(express.logger());
app.use(express.methodOverride());
app.use(cookieParser());
app.use(expressSession({ secret: 'keyboard cat', resave: true, saveUninitialized: false }));
app.use(bodyParser.urlencoded({ extended : true }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
//app.use(express.static(__dirname + '/../../public'));

// Make passport user available for Jade (TO DO CONVERT TO SOMETHING OTHER THAN JADE!
app.get('*', function(req, res, next) {
  // put user into res.locals for easy access from templates
  res.locals.user = req.user || null;
  //console.log('user is ' + JSON.stringify(req.user) + ' and locals is ' + JSON.stringify(res.locals.user) );
  next();
});

app.get('/', function(req, res){
	res.render('index', { user: res.locals.user });
});

app.post('/getConfig', ensureAuthenticated, function (req, res) {
	var config = require('./conf/config.js');
        // read environment variables - to send to the client
        var envs = config.envs
	var coIDs = [];
        envs.forEach(function(env) {
            coIDs.push ({ coID: env.coID, coDescription: env.coDescription });
        }); 
        var integrationTypes = config.integrationTypes;
	var types = [];
        integrationTypes.forEach(function(integrationType) {
            types.push({ type: integrationType.type, displayName: integrationType.displayName, configuredEnvironments: integrationType.configuredEnvironments });
        }); 
	var data = { coIDs: coIDs , types: types };
	res.send(data);
	console.log('JUST SENT ' + JSON.stringify(data));
});

// Handle post for file upload
app.post('/upload', ensureAuthenticated, function (req, res) {
    // get the temporary location of the file
    var coID = req.body.coID ;
    var type = req.body.type ;
    var feedType = req.body.feedType ;
    var clientName = req.body.clientName ;
    var loadDataFilters = req.body.loadDataFilters ;
    console.log('Got From /upload post ' + JSON.stringify(req.body));
    // if feedType is api - we do not actually have a file to upload
    // TODO instead of upload test the API config
	
    // set where the file should actually exists - in this case it is in the "images" directory
    console.log('feedType is ' + feedType)
    if ( feedType == 'csv' ) {
      console.log('process a csv feedType');
      if ( typeof req.files.file !== 'undefined' ) {
        var tempPath = req.files.file.path;
        var fileName = req.files.file.name;
      } else {
        io.sockets.emit({ "error": "uploadFileFailed", "data": "no file name found" });
        throw ('No fle name from file upload');
      }
      var target_path = './public/data/' + fileName;
      //target_path = target_path +  uniqueNumber.generate();
      // move the file from the temporary location to the intended location
      fs.move(tempPath, target_path, { overwrite: true }, function (err) {
        if (err) {
          //throw err;
          io.sockets.emit({ "error": "uploadFileFailed", "data": err });
        } 
        console.log
      });
    } else {
      // ToDo - come up with a decent name for an api log append name
      console.log('process a api feedType');
      var tempPath = 'api';
      var fileName = 'api';
    }
    console.log('success!')
    // Going to grab a log file to use .. it will be the name of the upload
    // file (but in /public/log 
    var logFile = './public/logs/' +fileName + '.log'
    console.log('log file is ' + logFile );
    try {
      fs.accessSync(logFile, fs.F_OK);
      // if the file exists warn that may have already uploaded this data 
       var logExists = true;
    } catch (e) {
      // not really an error - but write the date to the file
      // It isn't accessible
    }
    if ( typeof logExists !== 'undefined' && logExists ) { 
      var fileData = { 'file': fileName , 'logFileName': logFile, 'warn' : 'Log file ' + logFile + ' already exists. Please ensure that ' + fileName + ' has not already been uploaded!' };
    } else {
      fs.closeSync(fs.openSync(logFile, 'w'));
      var fileData = { 'file': fileName, 'logFileName': logFile };
    }
    var appLog = bunyan.createLogger({
      name: 'server',
      streams: [{
      path: logFile
      }]
    })
    fileData.coID = coID;
    fileData.type = type;
    fileData.feedType = feedType;
    fileData.clientName = clientName;
    fileData.loadDataFilters = loadDataFilters;
    fileData.loadDataReady = true;
    // Grab the client settings from the config file (via the env resources)
    var env = require('./resources/env.js');
    env.env({ coID: coID, type: type, get: '' }, function(opts) {
        fileData.clientSettings = opts.opts.clientSettings;        
        fileData.objectsToMap = opts.opts.objectsToMap;        
        fileData.objectsToValidate = opts.opts.objectsToValidate;        
        fileData.callbackRules = opts.opts.callbackRules;        
    })
    appLog.info('loadDataReady: ', fileData);
    console.log('emit to loadDataReady do we know what coID is ' + coID);
    console.log('emit to loadDataReady fileData is ' + JSON.stringify(fileData));
    io.sockets.emit('loadDataReady', fileData );
    res.end('yes');
});

app.get('/getFromApi', ensureAuthenticated, function (req, res) {
	var config = require('./conf/config.js');
        // read environment variables 
        var envs = config.envs
	var coIDs = [];
        envs.forEach(function(env) {
            coIDs.push (env.coID);;
        }); 
        var integrationTypes = config.integrationTypes
	var types = [];
        integrationTypes.forEach(function(integrationType) {
            types.push(integrationType.type);
        }); 
	var data = { coIDs: coIDs , types: types };
	res.send(data);
	console.log('JUST SENT ' + JSON.stringify(data));
});

console.log('starting the child process');
//var cp = require('child_process').fork('integration');
var fork = require('child_process').fork;
var cp = fork('integration');
cp.on('error', function(err) {
  console.log('Oh no, the errors: ' + err);
  io.sockets.emit({ "error": "fatalError", "data": err });
  cp.kill();
  cp = fork('integration');
});
cp.on('exit', function(code, signal) {
  console.log('Child Process Exited: ' + code + signal);
  io.sockets.emit({ "error": "fatalError", "data": code + signal });
  cp.kill();
  cp = fork('integration');
});


// Monitor the child process for messages and relay to client
cp.on('message', function (message) {
    //console.log('message is ' + JSON.stringify(message));
    if (message.invalidData) {
      // this is an "error" so add message.isError = true
      message.isError = true;
      console.log('Send missing objects to client: ' + JSON.stringify(message));
      io.sockets.emit("invalidData", message.invalidData);
    } else if (message.error) {
      // status message sent by the child process - send it to the client
      console.log('WE HAVE AN ERROR !!!!!' + JSON.stringify(message));
      console.log('WE HAVE AN ERROR !!!!!' + JSON.stringify(message.data));
      io.sockets.emit('error', message );
    } else if (message.status) {
      // status message sent by the child process - send it to the client
      io.sockets.emit('status', message.status );
    } else if (message.feedTransactions) {
      message.hasHeader = true;
      io.sockets.emit('feedTransactions', message );
    } else if (message.feedErrors) {
      message.hasHeader = true;
      io.sockets.emit('feedErrors', message );
    } else if (message.controlTotals) {
      io.sockets.emit('controlTotals', message );
    } else if (message.salesInvoiceDefaults) {
      io.sockets.emit('salesInvoiceDefaults', message );
    } else if (message.createdObject) {
      io.sockets.emit('createdObject', message );
    } else if (message.getDefaultsResult) {
      io.sockets.emit('getDefaultsResult', message );
    } else if (message.extractStaticData) {
      // one of the extractStaticData has finished ...
      io.sockets.emit('extractStaticData', message );
    } else if (message.valuesToValidate) {
      io.sockets.emit('valuesToValidate', message );
    } else if (message.mapData) {
      io.sockets.emit('mapData', message );
    } else if (message.createdObject) {
      // Actually want to force refresh of missing object
      io.sockets.emit('createdObject', message );
    } else if (message.fetchedFromApi) {
      // Actually want to force refresh of missing object
      io.sockets.emit('fetchedFromApi', message );
    } else if (message.creatingTransaction) {
      // Means a transaction has been sent to SOAP
      io.sockets.emit('creatingTransaction', message );
    } else if (message.loadDataStatus) {
      // Means a transaction has been sent to SOAP
      io.sockets.emit('loadDataStatus', message );
    } else if (message.createdTransaction) {
      // Means a transaction has been returned from SOAP
      io.sockets.emit('createdTransaction', message );
    } else if (message.wroteBack) {
      // Means a transaction has been returned from SOAP
      io.sockets.emit('wroteBack', message );
    } else if (message.soapResult) {
      console.log('Got SoapResult from child ' + JSON.stringify(message));	
      io.sockets.emit('soapResult', message );
    } 
    else {	    
      io.sockets.emit('update', message);
    }
    // clear the message
    message = null;
});

io.sockets.on('connection', function (socket) {
    socket.emit('status', { message: "Connected to server for processing. Press the Load Data button to read the transactions." });

    socket.on('extractStaticData', function (data) {
	console.log('server.js got the extractStaticData ' + JSON.stringify(data));
        cp.send({ op: 'extractStaticData', data });
        socket.emit('status', { message: "Issued call to load static data from AccountsIQ. If you have changed a lot of codes (Customers, Items, Departments etc..) you may want to wait till complete to load the data." });
    });

    socket.on('stop', function (data) {
        cp.send({ op: 'stop' });
        socket.emit('status', { message: "Stopped" });
    });

    socket.on('loadData', function (data) {
        socket.emit('status', { message: "Loading Data File" });
	//console.log(JSON.stringify(data));
        cp.send({ op: 'loadData', data });
	console.log('loadData came with ' + JSON.stringify(data));
        socket.emit('status', { message: "Data File Load Complete .. about to load data ... please wait ..." });
    });

    socket.on('GetSalesInvoiceDefaults', function (data) {
        cp.send({ op: 'GetSalesInvoiceDefaults', customerCode: data });
        socket.emit('status', { message: "Retrieving Sales Invoice Defaults" });
    });

    socket.on('getDefaults', function (data) {
	console.log('getDefaults came with ' + JSON.stringify(data));
        cp.send({ op: 'getDefaults', data });
        socket.emit('status', { message: "Retrieving " + data.object + " Defaults" });
    });

    socket.on('createInvalidItem', function (data) {
	console.log('Server received createInvalidItem with ' + JSON.stringify(data));
        cp.send({ op: 'createInvalidItem', data });
    });

    socket.on('createTransactions', function (data) {
	console.log(JSON.stringify(data));
	console.log('ABOUT TO CREATE TRANSACTIONS');
        cp.send({ op: 'createTransactions', data });
        socket.emit('status', { message: "Issued Create Transactions ..." });
    });

    socket.on('getFromApi', function (data) {
	console.log(JSON.stringify(data));
	console.log('ABOUT TO Get From Api');
        cp.send({ op: 'getFromApi', data });
    });


    socket.on('loadMap', function (data) {
	// form to manage a data map has been called ..
	console.log('ABOUT TO LOAD MAP ' + JSON.stringify(data));
        cp.send({ op: 'loadMap', data });
    });

    socket.on('updateMap', function (data) {
	console.log('ABOUT TO UPDATE MAP VALUE ' + JSON.stringify(data));
	data.op = 'updateMap';
        cp.send(data);
    });
});

app.get('/login',
  passport.authenticate('azuread-openidconnect', { failureRedirect: '/login' }),
  function(req, res) {
    log.info('Login was called in the Sample');
    res.redirect('/');
});

// GET /auth/openid/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/auth/openid/return',
  passport.authenticate('azuread-openidconnect', { failureRedirect: '/login' }),
  function(req, res) {
    log.info('We received a return from AzureAD.');
    res.redirect('/');
  });

// POST /auth/openid/return
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.post('/auth/openid/return',
  passport.authenticate('azuread-openidconnect', { failureRedirect: '/login' }),
  function(req, res) {
    log.info('We received a return from AzureAD.');
    res.redirect('/');
  });

app.get('/logout', function(req, res){
req.session.destroy(function (err) {
    req.logOut();
    res.redirect(config.creds.redirectURL);
  });

});

// Socket messages
//server.listen(process.env.PORT || 3000);
//console.log('listening on' + process.env.PORT || 3000);
server.listen(ports[1])
app.listen(ports[0])

// Simple route middleware to ensure user is authenticated. (Section 4)

//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

