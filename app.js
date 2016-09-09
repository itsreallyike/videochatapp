var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var logger = require('morgan');
var serveStatic = require('serve-static');
var jade = require('jade')
var path = require('path');
var forceSsl = function (req, res, next) {
    if (req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(['https://', req.get('Host'), req.url].join(''));
    }
    return next();
 };

app.set('port', process.env.PORT || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(serveStatic(path.join(__dirname, 'public')));

if (process.env.NODE_ENV === 'development') {
  app.use(errorHandler());
}
app.configure(function() {
    if (env === 'production') {
        app.use(forceSsl);
    }
});

app.get("/", function(req, res) {
    res.render("index")
});

var connected = []
io.on('connection', function(socket) {
    connected.push(socket)
    console.log('a user connected to application url');
    
    if(connected.length > 1)
       io.sockets.emit('started', "two users have connected");
    
    socket.on('start', function(evt) {
        socket.broadcast.emit('start', evt);
    });
    socket.on('call', function(evt) {
        socket.broadcast.emit('call', evt)
    });
    socket.on('data', function(data) {
        socket.broadcast.emit('data', data);
    });
    socket.on('hangup', function(evt) {
       socket.broadcast.emit('hangup', evt);
    });
});
server.listen(app.get("port"), function () {
	console.log("listening on " + app.get("port"));
});