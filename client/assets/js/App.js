;(function ( global, win, doc, $, undefined) {
    "use strict";
    
    global.Client = {}.exports = Client;
    
    
    function messageWrapper(text) {
        var exp = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/i;
        return text.replace(exp,"<a href='$1' target='_blank'>$1</a>"); 
    }
    
    function Client( server, port ) {
        this.server = server;
        this.port = port;
        this.init();
    }
    
    Client.prototype = {
        init : function () 
        {
            this.body           = $('body');
            this.io             = null;
            this.socket         = null;
            this.serverUrl      = this.server + ( (this.port) ? ':' + this.port : '' );
            this.message        = $('#message');
            this.chatWrapper    = $('.chat-wrapper');
            this.loginWrapper   = $('.login-wrapper');
            this.maxMessage     = 50;

            var $this           = this;

            this.chatWrapper.hide();
            
            this.messageContainerSize();
            $(win).on('resize', function() {
                $this.messageContainerSize();
                $this.messageScroll();
            });
            
            $('.socket-log').html('<strong>bitte warten...</strong>');
            
            $.getScript('//'+this.serverUrl + '/socket.io/socket.io.js')
            .done(function(script, textStatus) {
                console.log( textStatus );

                $this.io = io;
                
                $this.connect();
                
                if( $this.socket !== null ) 
                {
                    $this.socket.on( 'connect', function () {

                        $this.useSocket();
                        $this.sendMessage();
                        $this.onKeyPress();

                    });
                }
            });
            
        },
        connect : function () 
        {
            if( this.io !== null ) 
            {
                this.socket = this.io.connect( this.serverUrl );
            }
        },
        useSocket : function () 
        {
            var socket = this.socket, $this = this, $log = $('.socket-log');
            //$log.html('socket connect');
            $log.html('');
            //console.log(socket);

            $('#login-form').on('submit', function(e) {
                e.preventDefault();
                var usnername = $('#username').val().trim();
                socket.emit("user login", usnername);
            });
            
            socket.on("login", function ( data ) {
                $this.loginWrapper.fadeOut();
                $this.chatWrapper.delay(200).fadeIn(200, function() {
                    $this.messageScroll();
                });

                var post = $('<li class="user-login">'+data.message+'</li>');
                $this.message.append( post );
                $this.fade(post);
            });
            
            socket.on("login message", function ( data ) {
                if( $.isArray(data.message) && data.message.length > 0 ) 
                {
                    for( var i = 0; i < data.message.length; i++) {
                        var color = (data.message[i].color.length > 0) ? ' color-' + data.message[i].color : '';
                        var post = $('<li class="user-post'+color+'"><div>'+messageWrapper(data.message[i].message)+'</div></li>');
                        $this.message.append( post );
                        $this.fade(post);
                    }
                }
                $this.messageScroll();
            });
            
            
            socket.on("return message", function(data) {
                var color = (data.color.length > 0) ? ' color-' + data.color : '';
                var post = $('<li class="user-write'+color+'"><div><span>'+messageWrapper(data.message)+'</span></div></li>');
                $this.message.append( post );
                $this.fade(post);
            });

            socket.on("user message login", function(data) {
                var post = $('<li class="user-post-login"><div>'+messageWrapper(data.message)+'</div></li>');
                $this.message.append( post );
                $this.fade(post);
            });
            
            socket.on("user message", function(data) {
                var color = (data.color.length > 0) ? ' color-' + data.color : '';
                var post = $('<li class="user-post'+color+'"><div>'+messageWrapper(data.message)+'</div></li>');
                $this.message.append( post );
                $this.fade(post);
            });
            
            socket.on("user logout", function(data) {
                var post = $('<li class="user-logout">'+data.message+'</li>');
                $this.message.append( post );
                $this.fade(post);
                
            });
            
            socket.on("return users", function(data) {
               
                var users = '';
                if( $.isArray(data.message) ) {
                    users += 'user lists:<br/>';
                    for( var i = 0; i < data.message.length; i++) {
                        users += '<strong>'+data.message[i]+'</strong><br />';
                    }
                    var post = $('<li class="user-list">'+users+'</li>');
                    $this.message.append( post);
                    $this.fade(post);
                }
            });

            socket.on("sow colors", function(data) {
                var post = $('<li class="user-post-colors"><div>'+messageWrapper(data.message)+'</div></li>');
                $this.message.append( post );
                $this.fade(post);

            });

            socket.on("user is typing", function( data ) {
                var text = $('.typing-info').text();
                text = text.replace( text, data.message );
                $('.typing-info').text( text );
            });

            socket.on("user is stop typing", function( data ) {
                var text = $('.typing-info').text();
                text = text.replace( data.message, '' );
                $('.typing-info').text( text );
            });

        },
        onKeyPress : function () {
            var $this = this;
            $('#msg').on('keypress', function( e ) {
                $this.socket.emit("user typing", { "message" : 'is typing'});
            });

            $('#msg').on('keyup', function( e ) {
                setTimeout(function() {
                    $this.socket.emit("user stop typing", { "message" : 'is typing'});
                }, 1000);
            });
        },

        sendMessage : function () {
            var $this = this;
            $('#msg-form').on('submit', function(e) {
                e.preventDefault();
                var text = $('#msg').val();

                $this.socket.emit("message", { "message" : text});
                
                $('#msg').val('');
            });
        },
        messageContainerSize : function () {
            var width = $(doc).innerWidth(), height = ($(doc).innerHeight()-80);
            $('#message-wrapper').css({'height' : height + 'px'});
        },
        messageScroll : function() {
            var wrapper = $('#message-wrapper'), 
                msg = this.message,
                msgEl = msg.find('li'),
                wHeight = wrapper.height(),
                mHeight = msg.height();

            if( mHeight > wHeight) {
                wrapper.stop(true, true).animate({
                    'scrollTop' : mHeight
                }, 700);
                
                if( msgEl.length > this.maxMessage+10 ) {
                    msgEl.each(function(index) {
                        if( index < 10 ) {
                            $(this).remove();
                        } 
                    });
                }
            }
        },
        fade: function(p) {
            var $this = this;
            p.addClass('hide').delay(100).queue(function() {
               $(this).removeClass("hide").addClass('show');
               $(this).dequeue();
               $this.messageScroll();
            });
        }
    };
    
}(this, window, document, jQuery));