var app = require('express')()
var server = require('http').Server(app)
var io = require('socket.io')(server);

server.listen(3000);

//global variables for the server
var clients = []
var playerSpawnPoints = []
var numOfPlayers = 0
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
        console.log(currentPlayer.name + ' rec player connect')
        for(var i=0; i<clients.length; i++){
            var playerConnected = {
            name:clients[i].name,
            position:clients[i].position,
            rotation:clients[i].rotation
            }
            socket.emit('other player connected', playerConnected);
            console.log(currentPlayer.name + ' emit: other player connected ' + JSON.stringify(playerConnected));
        }
        console.log("CLIENTSSSSSSs", clients)
    })

    socket.on('play', function(data){
        console.log(currentPlayer.name +' rec: play'+ JSON.stringify(data));
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

        var playerSpawnPoint = playerSpawnPoints[numOfPlayers];
        currentPlayer = {
            name: data.name,
            position: playerSpawnPoint.position,
            rotation: playerSpawnPoint.rotation,
            number: numOfPlayers+1
        }
        numOfPlayers += 1;
        clients.push(currentPlayer);
        console.log(currentPlayer.name +'emit: play: ' + JSON.stringify(currentPlayer))
        socket.emit('play', currentPlayer);
        socket.broadcast.emit('other_player_connected', currentPlayer);
        console.log("number of players: ",numOfPlayers)
    })
//can improve by nOT sending full currentPlayer object, but just rotate/move
    socket.on('player_move', function(data){
        // console.log('rec: move:' + JSON.stringify(data));
        currentPlayer.position = data.position;
        socket.broadcast.emit('player_move', currentPlayer);
    })

    socket.on('player_turn', function(data){
        // console.log('rec: rotate:' + JSON.stringify(data));
        currentPlayer.rotation = data.rotation;
        socket.broadcast.emit('player_turn', currentPlayer);
    })

    socket.on('open_door_1_1', function(){
        console.log('attempting to open door 1 - index.js')
        io.emit('open_door_1_1');
    })

    socket.on('open_door_1_2', function(){
        console.log('attempting to open door 1-2 - index.js')
        io.emit('open_door_1_2');
    })

    socket.on('open_all_door_one', function(){
        io.emit('open_door_1_2');
        io.emit('open_door_1_1');
    })

    socket.on('light_bulb_pressed', function(data){
        var num = data.name[0][data.name[0].length-1]
        if (Number(num) == bulb_pressed){
            console.log("numbers matched!!!!!!!!!!111",num, bulb_pressed)
            io.emit('update_light_bulbs',{bulb_pressed})
            bulb_pressed += 1
            console.log("bulb_pressed now: ", bulb_pressed)
        } else if (Number(num) < bulb_pressed){
            console.log("number is less than pressed", num, bulb_pressed)
        } else {
            console.log(`numbers didn't match, ${data.name[0]} and light_bulb_${bulb_pressed}`)
            bulb_pressed = 1
            io.emit('reset_light_bulbs')
        }
        if (bulb_pressed>= 10){
            io.emit('open_door_2')
        }
    })

    socket.on('room_one_button_pressed', function(data){
        console.log(data)
        console.log("room one button presssed",data.name[0])
        if (data.name[0] == "3"){
            console.log("you hit room 3!")
            buttonsPressed.room_three = true;
        } else if (data.name[0] == "2"){
            console.log("you hit room 2!")
            buttonsPressed.room_two = true;
        } else if (data.name[0] == "1"){
            console.log("you hit room 1!")
            buttonsPressed.room_one= true;
        }
        if (buttonsPressed.room_one && buttonsPressed.room_two && buttonsPressed.room_three){
            io.emit('open_door_1_1');
        }
    })

    socket.on('go_button_pressed', function(){
        console.log("go button pressed!!1")
        socket.broadcast.emit("start_tile_countdown")
    })
    
    socket.on("send_current_tile", function(data){
        if (tiles_sent <2){
            temp_arr.push(String(data['name']))
            tiles_sent++
        } else {
            temp_arr.push(String(data['name']))
            console.log("checking current tileset, ", tile_arr[current_tile])
            for(var i =0; i<temp_arr.length; i++){
                if(!tile_arr[current_tile].includes(temp_arr[i])){
                    console.log(`${temp_arr[i]} is not included, resetting`)
                    io.emit("reset_tiles")
                    tiles_sent = 0
                    current_tile = 0
                    temp_arr = []
                    return
                }
            }
            var arr = {data: temp_arr}
            console.log("all 3 passed, increasing current tile")
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
        console.log(currentPlayer.name +'rec: dis: ' + currentPlayer.name)
        socket.broadcast.emit('other_player_disconnected', currentPlayer)
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

// function guid(){
//     function s4(){
//         return Math.floor((1+Math.random()) * 0x10000).toString(16).substring(1);
//     }
//     return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
// }

console.log('server is running')