var express = require('express'),
    app     = express(),
    url     = require('url'),
    server  = require('http').createServer(app),
    io      = require('socket.io')(server),
    port    = process.env.PORT || 1234;

var buffer      = new Array(),
    userList    = new Array(),
    usernames   = {},
    userNr      = 0;


function removeHTML ( content ) {
    var tmp = content.replace(/(<.*['"])([^'"]*)(['"]>)/g,function(x, p1, p2, p3) { return  p1 + p3;});
    return tmp.replace(/<\/?[^>]+>/gi, '');
}

function trim ( content ) {
    return content.replace(/[\n\r]/g, '').replace(/ +/g, ' ').replace(/^\s+/g, '').replace(/\s+$/g, '');
}


io.on('connection', function(socket) {

    var addedUser = false;
    var userColor = '';


    if( buffer.length > 15 ) {
        buffer.shift();
    }

    // on user Login
    socket.on('user login', function( name ) {
        if( name !== null && name.length > 0) {
            var userName = name;
            userName = removeHTML(userName);
            userName = trim(userName);

            socket.username = userName;
            usernames[userName] = userName;
            userList.push( userName );

            ++userNr;
            addedUser = true;

            socket.emit('login message', {'message' : buffer });
            socket.emit('login', {'message' : 'willkommen <strong>' + userName + '</stong>' });
            socket.broadcast.emit('user message login', {'message' : '<strong>' + userName + '</strong> ist dem Chat beigetreten'});
        }
    });

    // on send message
    socket.on('message', function (data) {

        var message = data.message;
        if(message.length > 0 ) {

            message = removeHTML(message);
            message = trim(message);

            socket.emit('return message', {'message' : message, 'color' : userColor });

            switch ( message ) {
                case '/users' :
                    socket.emit('return users', {'message' : userList });
                    break;
                case '/colors' :
                    socket.emit('sow colors', {'message' : "/red, /orange, /blue, /green, /unicorn", 'color': userColor });
                    break;
                case '/red' :
                    userColor = 'red';
                    break;
                case '/orange' :
                    userColor = 'orange';
                    break;
                case '/blue' :
                    userColor = 'blue';
                    break;
                case '/green' :
                    userColor = 'green';
                    break;
                case '/unicorn' :
                    userColor = 'unicorn';
                    break;
                default: 
                    var msgBuffer = {'message' : '<strong>' + socket.username + ':</strong> ' + message, 'color': userColor};
                    buffer.push(msgBuffer);
                    socket.broadcast.emit('user message', msgBuffer);
                    break;
            }
        }
    });

    //
    socket.on('user typing', function (data) {
        var message = socket.username + ' ' + data.message + ' ';
        socket.broadcast.emit('user is typing', {'message' : message });
    });

    socket.on('user stop typing', function (data) {
        var message = socket.username + ' ' + data.message + ' ';
        socket.broadcast.emit('user is stop typing', {'message' : message });
    });

    socket.on('disconnect', function() {
        if (addedUser) {
            delete usernames[socket.username];
            --userNr;

            socket.broadcast.emit('user logout', {'message' : socket.username + ' hat den Raum verlassen.'});

            for (var i = 0; i < userList.length; i++ ) {
                var username = userList[i];
                if( username == socket.username ) {
                    userList.splice(i, 1);
                }
            }
        }
        console.log('disconnect');
    });

});
io.listen(port);