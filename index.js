var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server);

server.listen(3000);

var clients = []
var playerSpawnPoints = []
var numOfPlayers = 0
var current_players = []
var buttonsPressed = {
    room_one: false,
    room_two: false,
    room_three: false
}
var bulb_pressed = 1;
var tile_arr = [
    ["Cube1-2","Cube3-3","Cube5-4"],["Cube2-2","Cube8-3","Cube10-4"],["Cube7-2","Cube9-3","Cube9-4"],["Cube8-2","Cube14-3","Cube14-4"],["Cube13-2","Cube19-3","Cube13-4"],["Cube18-2","Cube18-3","Cube18-4"],["Cube17-2","Cube17-3","Cube23-4"],["Cube16-2","Cube16-3", "Cube22-4"],["Cube21-2","Cube21-3","Cube21-4"]
]
var temp_arr = []
var current_tile = 0;
var tiles_sent = 0;

app.get('/', function(req, res){
    res.send('you got back a get request')
})

io.on('connection', function(socket){
    var currentPlayer = {};
    currentPlayer.name = 'unknown';

    socket.on('player_connect', function(){
        for(var i=0; i<clients.length; i++){
            var playerConnected = {
            name:clients[i].name,
            position:clients[i].position,
            rotation:clients[i].rotation
            }
            socket.emit('other player connected', playerConnected);
        }
    })

    socket.on('play', function(data){
        if (clients.length === 0){
            playerSpawnPoints = [];
            data.playerSpawnPoints.forEach(function(_playerSpawnPoint){
                var playerSpawnPoint = {
                    position: _playerSpawnPoint.position,
                    rotation: _playerSpawnPoint.rotation
                };
                playerSpawnPoints.push(playerSpawnPoint);
            })
        }

        if (!current_players.includes(1)){
            var playerSpawnPoint = playerSpawnPoints[0];
            currentPlayer = {
                name: data.name,
                position: playerSpawnPoint.position,
                rotation: playerSpawnPoint.rotation,
                number: 1
            }
            current_players.push(1)
        } else if (!current_players.includes(2)){
            var playerSpawnPoint = playerSpawnPoints[1];
            currentPlayer = {
                name: data.name,
                position: playerSpawnPoint.position,
                rotation: playerSpawnPoint.rotation,
                number: 2
            }
            current_players.push(2)
        } else if (!current_players.includes(3)){
            var playerSpawnPoint = playerSpawnPoints[2];
            currentPlayer = {
                name: data.name,
                position: playerSpawnPoint.position,
                rotation: playerSpawnPoint.rotation,
                number: 3
            }
            current_players.push(3)
        } else if (!current_players.includes(4)){
            var playerSpawnPoint = playerSpawnPoints[3];
            currentPlayer = {
                name: data.name,
                position: playerSpawnPoint.position,
                rotation: playerSpawnPoint.rotation,
                number: 4
            }
            current_players.push(4)
        }

        numOfPlayers += 1;
        clients.push(currentPlayer);
        socket.emit('play', currentPlayer);
        socket.broadcast.emit('other_player_connected', currentPlayer);
        console.log("number of players: ",numOfPlayers)
    })
//can improve by not sending full currentPlayer object, but just rotate/move
    socket.on('player_move', function(data){
        currentPlayer.position = data.position;
        socket.broadcast.emit('player_move', currentPlayer);
    })

    socket.on('player_turn', function(data){
        currentPlayer.rotation = data.rotation;
        socket.broadcast.emit('player_turn', currentPlayer);
    })

    socket.on('open_door_1_1', function(){
        io.emit('open_door_1_1');
    })

    socket.on('open_door_1_2', function(){
        io.emit('open_door_1_2');
    })

    socket.on('open_all_door_one', function(){
        io.emit('open_door_1_2');
        io.emit('open_door_1_1');
    })

    socket.on('light_bulb_pressed', function(data){
        var num = data.name[0][data.name[0].length-1]
        if (Number(num) == bulb_pressed){
            io.emit('update_light_bulbs',{bulb_pressed})
            bulb_pressed += 1
        } else if (Number(num) < bulb_pressed){
        } else {
            bulb_pressed = 1
            io.emit('reset_light_bulbs')
        }
        if (bulb_pressed>= 10){
            io.emit('open_door_2')
        }
    })

    socket.on('room_one_button_pressed', function(data){
        if (data.name[0] == "3"){
            buttonsPressed.room_three = true;
        } else if (data.name[0] == "2"){
            buttonsPressed.room_two = true;
        } else if (data.name[0] == "1"){
            buttonsPressed.room_one= true;
        }
        if (buttonsPressed.room_one && buttonsPressed.room_two && buttonsPressed.room_three){
            io.emit('open_door_1_1');
        }
    })

    socket.on('go_button_pressed', function(){
        socket.broadcast.emit("start_tile_countdown")
    })
    
    socket.on("send_current_tile", function(data){
        if (tiles_sent <2){
            temp_arr.push(String(data['name']))
            tiles_sent++
        } else {
            temp_arr.push(String(data['name']))
            for(var i =0; i<temp_arr.length; i++){
                if(!tile_arr[current_tile].includes(temp_arr[i])){
                    // console.log(`${temp_arr[i]} is not included, resetting`)
                    io.emit("reset_tiles")
                    tiles_sent = 0
                    current_tile = 0
                    temp_arr = []
                    return
                }
            }
            var arr = {data: temp_arr}
            io.emit("update_tiles", arr)
            current_tile ++
            tiles_sent = 0
            temp_arr = []
        }
        if (current_tile >=9){
            io.emit("open_door_3")
        }
    })

    socket.on("send_video_one", function(data){
        socket.broadcast.emit("update_video_one", data)
    })
    socket.on("send_video_two", function(data){
        socket.broadcast.emit("update_video_two", data)
    })
    socket.on("send_video_three", function(data){
        socket.broadcast.emit("update_video_three", data)
    })
    socket.on("send_video_four", function(data){
        socket.broadcast.emit("update_video_four", data)
    })

    socket.on('disconnect', function(){
        socket.broadcast.emit('other_player_disconnected', currentPlayer)
        for(var j=0; j<current_players.length; j++){
            if (current_players[j] === currentPlayer.number){
                current_players.splice(j,1);
            }
        }

        for(var i=0; i<clients.length; i++){
            if (clients[i].name === currentPlayer.name){
                clients.splice(i,1);
            }
        }
        if (numOfPlayers>0){
            numOfPlayers-=1
        }
        if (numOfPlayers <= 0){
            numOfPlayers = 0
            bulb_pressed = 1
        }
        console.log("number of players: ",numOfPlayers)
    })
})

console.log('server is running')
