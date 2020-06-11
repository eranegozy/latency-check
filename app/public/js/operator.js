var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);



const options = {
  // secure: true,
  // hostname: 'localhost',
  port: 8000,
  // See https://socketcluster.io/#!/docs/api-socketcluster-client for all available options
};
const socket = socketClusterClient.create(options);

// Recieve Roundtrip times and Add them to the page
var send_time = socket.subscribe('send_time');
var add_button = socket.subscribe("addButton");
var remove_button = socket.subscribe("removeButton");
var connected = socket.subscribe("connected");
var disconnected = socket.subscribe("disconnected");

// Send play command to client
function send_play(clientID) {
    document.getElementById("time").innerHTML = "";
    cTime = Date.now();
    socket.transmitPublish('play', clientID);
    createMediaRecorder();
    // startRecording();
}

(async() => {
    for await (let data of connected){
        // console.log("con" + data.socketID);
        console.log("con" + data.clientID);

        console.log(data);
        $("#buttonArea").append(`<button class="button" onclick = "send_play(${data.clientID})" id="${data.clientID}">${data.clientID}</button>`);
        // $("#buttonArea").append(`<button class="button" onclick = "send_play('${data.socketID}')" id="${data.socketID}">${data.socketID}</button>`);

    }
})();

(async() => {
    for await (let data of disconnected){
        // console.log("dis" + data.socketID)
        console.log("dis" + data.clientID);
        $(`#${data.clientID}`).remove();
        // $(`#${data.socketID}`).remove();
    }
})();

(async() => {
    for await (let j of send_time) {
        let rec_time = j.time;
        let num = j.id;
        let now = Date.now()
        let rt_time = now - cTime;
        let back_time = now - rec_time;
        let to_time = rec_time - cTime;
        document.getElementById("time").innerHTML += num + "<br> Time to took " + 
        to_time + 'ms' + "<br> Time back took " + 
        back_time +"ms <br> Roundtrip took " + 
        rt_time + 'ms <br> <br>';
    }
})();

// Log errors
(async() => {
    for await (let err of socket.listener('error'))
        console.error(err);
})();

(async() => {
    for await (let data of socket.listener('connect'))
        console.log('Socket is connected');
})();

(async() => {
    for await (let data of socket.listener('subscribe'))
        console.log(`Socket is subscribed to ${data.channel}`);
})();

