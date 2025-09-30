window.Realtime = (function(){
    var socket = null;
    var currentRoom = null;

    function connect(){
        if(socket){ return socket; }
        // if socket.io client not present (opened via file://), bail gracefully
        if (typeof io === 'undefined'){
            console.warn('Socket.IO client não encontrado. Inicie o servidor Node e acesse via http://localhost:3000/');
            return null;
        }
        // connect to Vercel serverless function
        socket = io({
            path: '/api/socket',
            transports: ['websocket', 'polling']
        });

        // forward events into game if globals exist
        socket.on('room_config', function(cfg){
            // update limits
            if(window.s_oGame && window.s_oGame.onRoomConfig){
                window.s_oGame.onRoomConfig(cfg);
            }
        });
        socket.on('players_update', function(count){
            if(window.s_oInterface && window.s_oGame && window.s_oGame.getCurrentRoom){
                var room = window.s_oGame.getCurrentRoom();
                window.s_oInterface.updateRoomInfo(room, count);
            }
        });
        socket.on('dice_result', function(roll){
            if(window.s_oGame && window.s_oGame.onServerRoll){
                window.s_oGame.onServerRoll(roll);
            }
        });
        socket.on('room_full', function(){
            alert('Sala cheia. Tente outra sala.');
        });
        socket.on('turn_update', function(data){
            if(window.s_oGame && window.s_oGame.onTurnUpdate){
                window.s_oGame.onTurnUpdate(data);
            }
        });
        socket.on('turn_tick', function(data){
            if(window.s_oInterface && window.s_oInterface.updateTurnTimer){
                window.s_oInterface.updateTurnTimer(data.remaining);
            }
        });
        return socket;
    }

    function join(room){
        var s = connect();
        if(!s){ return; }
        currentRoom = room;
        s.emit('join_room', room);
    }

    function requestRoll(){
        if(!socket) return;
        socket.emit('request_roll');
    }

    function getSocket(){ return socket; }

    return {
        connect: connect,
        join: join,
        requestRoll: requestRoll,
        getSocket: getSocket
    };
})();

