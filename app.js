var app = require('express')();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
// using module to force ssl on heroku
var enforce = require('express-sslify');
var logger = require('morgan');
var serveStatic = require('serve-static');
var jade = require('jade')
var path = require('path');

app.set('port', process.env.PORT || 8888);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
//using module to force ssl on Heroku
if (process.env.NODE_ENV === 'production') {
    app.use(enforce.HTTPS( {trustProtoHeader: true} )); 
};
app.use(logger('dev'));
app.use(serveStatic(path.join(__dirname, 'public')));
if (process.env.NODE_ENV === 'development') {
    app.use(errorHandler());
}
    
app.get("/", function(req, res) {
    res.render("index")
});

var chatApp = io.of('/videochat');
var users = [];
var theRoom;
var count = [];

chatApp.on('connection', function(socket) {
    console.log("current number of users connected: " + Object.keys(chatApp.connected).length)
    console.log('a user joined the room. Socket: ' + socket.id)

    socket.on('room', function(room) {
        socket.join(room)
        users.push(socket.id);
        theRoom = room
        console.log("current users :" + users);
        if(Object.keys(chatApp.connected).length > 1)
            chatApp.to(theRoom).emit('started', users);
    });
    socket.on('start', function(evt) {
        count.push(evt)
        if(Object.keys(chatApp.connected).length > 1 && count.length > 1)
            chatApp.to(theRoom).emit('start', evt)
        if(Object.keys(chatApp.connected).length > 1 && count.length > 1)
            count.length = 1 
    });
    socket.on('call', function(evt) {
        socket.broadcast.to(theRoom).emit('call', evt)
    });
    socket.on('data', function(data) {
        socket.broadcast.to(theRoom).emit('data', data)
    });
    socket.on('hangup', function(evt) {
       socket.broadcast.to(theRoom).emit('hangup', evt)
       socket.leave("chatroom")
    });
    socket.on('disconnect', function() {
        for(var i = 0; i <= users.length - 1; i++) {
            if(users[i] === socket.id) {
            users.splice(users[i], 1) 
            }
        }
        console.log('A user disconnected, current users: ' + users)
        console.log("current number of users: " + Object.keys(chatApp.connected).length)
        if(Object.keys(chatApp.connected).length < 2)
            chatApp.to(theRoom).emit('started', {disconnected: true, user: users})
        if(Object.keys(chatApp.connected).length < 2)
            chatApp.to(theRoom).emit('start', {disconnected: true, user: users})
    });
});
server.listen(app.get("port"), function () {
	console.log("listening on " + app.get("port"));
});