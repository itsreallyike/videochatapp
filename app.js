var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var logger = require('morgan');
var serveStatic = require('serve-static');
var jade = require('jade')
var path = require('path');

app.set('port', process.env.PORT || 8080);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(logger('dev'));
app.use(serveStatic(path.join(__dirname, 'public')));

if (process.env.NODE_ENV === 'development') {
  app.use(errorHandler());
}

app.get("/", function(req, res) {
    res.render("index")
});

io.on('connection', function(socket) {
    console.log('a user connected to application url');

    socket.on('start', function(evt) {
        socket.broadcast.emit('start', evt)
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