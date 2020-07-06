var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);
var mediaRecorder;
var constraints = {
    audio: {
      //sampleRate: 44100
    },
    video: false
  };
var opt = {};

if (navigator.mediaDevices){
    navigator.mediaDevices.getUserMedia(constraints).then(
        function(stream){
            mediaRecorder = new MediaRecorder(stream, opt);
        }
    )}

const options = {
  // secure: true,
  // hostname: 'localhost',
  port: 8000,
  // See https://socketcluster.io/#!/docs/api-socketcluster-client for all available options
};
const socket = socketClusterClient.create(options);
var syncClock;
requirejs(["js/syncclock"], function(clock) {
    syncClock = new clock.SyncClock(socket);
});
function updateTime(){
    if (syncClock != null)
        document.getElementById('time').innerHTML = syncClock.getTime().toFixed(4);
}
setInterval(updateTime, 1);
var serverTime;


// Recieve Roundtrip times and Add them to the page
var send_time = socket.subscribe('send_time');
var add_button = socket.subscribe("addButton");
var remove_button = socket.subscribe("removeButton");
var connected = socket.subscribe("connected");
var disconnected = socket.subscribe("disconnected");

// Send play command to client
function send_play(letter) {
    document.getElementById("time").innerHTML = "";
    console.log(letter);
    serverTime = syncClock.getTime();
    socket.transmitPublish('play', {clientID: letter, serverTime: serverTime});
    createMediaRecorder(mediaRecorder, socket, letter);
    // createMediaRecorder(socket, letter);
    // socket.transmitPublish('finishedPlaying', letter);
}

(async() => {
    for await (let data of connected){
        // console.log("con" + data.socketID);
        console.log("con" + data.clientID);
        console.log(data);
        $("#buttonArea").append(`<button class="button" onclick = "send_play('${data.clientID}')" id="${data.clientID}">${data.clientID}</button>`);
    }
})();

(async() => {
    for await (let data of disconnected){
        // console.log("dis" + data.socketID)
        console.log("dis" + data.clientID);
        $(`#${data.clientID}`).remove();
    }
})();

var prelagSamples;
(async() => {
    for await (let data of send_time) {
        prelagSamples = data.prelag * 1000 * 44.1;
        console.log('prelag', data.prelag);
        console.log('samples', prelagSamples);
        
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

