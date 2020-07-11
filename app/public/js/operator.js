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
        document.getElementById('time').innerHTML = syncClock.getTime().toFixed(3);
}
setInterval(updateTime, 1);
var serverTime;


// Recieve Roundtrip times and Add them to the page
var send_time = socket.subscribe('send_time');

var connected = socket.subscribe("connected");
var disconnected = socket.subscribe("disconnected");

const audio_filename = 'audio/chirp.wav';
var audioContext, buffer;
try{
    audioContext = new webkitAudioContext();
} catch{
    audioContext = new AudioContext();
}
var audio_xhr = new XMLHttpRequest();
audio_xhr.open('GET', audio_filename, true);
audio_xhr.responseType = 'arraybuffer';
audio_xhr.onload = function() {
    audioContext.decodeAudioData(audio_xhr.response, function(theBuffer){
        buffer = theBuffer;
    });
}
function playSample(audioContext, audioBuffer) {
    if (audioContext.state == 'suspended'){
        audioContext.resume();
    }
    const sampleSource = audioContext.createBufferSource();
    sampleSource.buffer = audioBuffer;
    sampleSource.connect(audioContext.destination)
    sampleSource.start();
    return sampleSource;
}

// Send play command to client
function send_play(letter) {
    // document.getElementById("lag_time").innerHTML = "";
    console.log(letter);
    serverTime = syncClock.getTime();
    
    createMediaRecorder(mediaRecorder, socket, letter);
    playSample(audioContext, buffer);

    setTimeout(() => {socket.transmitPublish('play', {clientID: letter, serverTime: serverTime});}, 500);
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

