'use-strict';

const net = require('net');

// Simple HTTP server responds with a simple WebSocket client test
const httpServer = net.createServer(connection => {
    connection.on('data', () => {
        let htmlContent = `
<!DOCTYPE html>
<html>
    <head>
        <meta charset="UTF-8" />
        <title>WebSocket test page</title>
        <style>
            body {background: #404040}
            div {text-align: center}
            h1 {color: beige; text-align: center; font-family: "Andale Mono"; font-size: 170%}
            script{color: #7b78ff; font-family: "Andale Mono"}
            p, h3{color: beige; font-size: 80%; font-family: "Andale Mono"; font-weight: bold}
            input{width: 100px; text-align: left; background: rgba(255,211,142,0.33)}
            button{color: beige; background: #404040; border-bottom-color: rgba(64,64,64,0.79)}
        </style>
    </head>
    <body>
    <div>
        <h1>Øving 7: Websockets</h1>
    </div>
    <br/>
   <div align="center">
   <p>Display name: <input id="username" value="Anonymous"/></p>
    <br/>
    <input id="inputMessage" value = "write message.."/>
    <button type="button" onclick="sendmsg()">Send</button></br>
    <br/>
    <canvas hidden="true"></canvas>
    </div>
    <div id="message-board" align="center">
        <p>_______________________________________________________</p>
        <h3>Message board</h3>
        <p id="message"></p>
        <p >_______________________________________________________</p>
    </div>
    <script>
    let ws = new WebSocket('ws://localhost:3001');
    console.log('Attempting WebSocket connection..');
    ws.onopen = () => ws.send("Opened");
    let msgs = "";
    
    let sendmsg = () => {
        let message = document.getElementById("inputMessage").value;
        let username = document.getElementById("username").value;
        let jsonMessage = {
            "username": username,
            "message":message,

        };
        
        msgs += username + ": " + message +  "</br>" + sep;
        document.getElementById("message").innerHTML = msgs;
        ws.send(JSON.stringify(jsonMessage));
        document.getElementById("inputMessage").value = "";
    };
        
    ws.onmessage = event => {
    let jsonMessage = JSON.parse(event.data);
    let messageElement = jsonMessage["username"] + ": " + jsonMessage["message"] + "</br>";

    msgs += messageElement;
    document.getElementById("message").innerHTML= msgs;
    alert('Message from server: ' + event.data);

  };
 
   ws.onerror = (error) =>{
        console.log('Socket error: ' + error);
   };
    
    </script>
    </body>
</html>
`;
        connection.write('HTTP/1.1 200 OK\r\nContent-Length: ' + htmlContent.length + '\r\n\r\n' + htmlContent);
    });
});
const port = 3000;
httpServer.listen(port, () => {
    console.log('httpServer (Webclient) is listening on port ' + port);
});


//WebSocket server
const webSocketServer = net.createServer(connection=>{
    console.log('Client connected');

    connection.on('data', data => {
        if (!(connectedClients.has(connection))) {
            console.log('Clients are not connected yet. Sending a handshake to establish connection');
            let handshake = doHandshake(data);
            connection.write(handshake);
            connectedClients.add(connection);
        }
        else {
            let bytes = Buffer.from(data);
            let length = bytes[1] & 127;
            let mStart = 2;
            let dStart = mStart + 4;
            let message = "";
            for (let i = dStart; i < dStart + length; i++) {
                let byte = bytes[i] ^ bytes[mStart + ((i - dStart) % 4)];
                message += String.fromCharCode(byte);
            }
            connectedClients.broadcast(message, connection);
        }
    })
        //console.log('Data recieved from client: ' + data.toString());

    connection.on('end', () =>{
        connectedClients.delete(connection);
        console.log('Client disconnected');
    });
});

webSocketServer.on('error', error =>{
    console.error('Error message: ' + error);
});

const port2 = 3001;
webSocketServer.listen(port2, () =>{
    console.log('Websocket-server listening on port ' + port2);
});

/* Decode and broadcast message to connected clients
*
* 1. Convert decimal 2 to heximal
* 2. Keep track of all connected clients
* 3. decode and broadcast message to connected clients
*
 */
// https://gist.github.com/agirorn/0e740d012b620968225de58859ccef5c -- documentation for func
function dec2hexString(dec) {return '0x' + (dec+0x10000).toString(16).substr(-4).toUpperCase();} // 1

const connectedClients = new Set();// 2

// 3 decoding/creating message
const makeMessage = (data) =>{
    let firstBuffer = new Buffer([0x81]);
    let messagelength = data.length;
    let scndBuffer = new Buffer([dec2hexString(messagelength)]);
    let thirdBuffer = Buffer.from(data);

    return Buffer.concat([firstBuffer,scndBuffer,thirdBuffer]);
}

//broadcasting message to all connected clients

connectedClients.broadcast = function (data, s) {
    for(let socket of this){
        if(socket !== s){
            socket.write(makeMessage(data));
        }
    }
};

// Creating the websocket handshake
const doHandshake = (data) => {
    let GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

    //Retriving sec-key from the header
    let wholeResponse = data.toString().split('\n');
    console.log(wholeResponse);
    let row = wholeResponse[12]. split(' ');
    console.log(row);
    let secKeyClient = row[1].slice(0,-1);
    console.log(secKeyClient);

    //Combine sec key with GUID
    let key = secKeyClient + GUID;
    console.log(key);

    //hash key with SHA1, then create handshake
    let hash = require("crypto").createHash("SHA1").update(key).digest("base64");
    let handshake = "HTTP/1.1 101 Switching Protocols\r\n" + "Upgrade: websocket\r\n" + "Connection: Upgrade\r\n" + "Sec-WebSocket-Accept: " + hash + "\r\n" + "\r\n";
    return handshake;
};







