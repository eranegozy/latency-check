var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

const serverString = window.location.origin;
console.log(serverString);
console.log(location.host);
var users = {}
const numTests = 3;
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
//   port: 8000,
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
setInterval(updateTime, 0.1);
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
function send_play(letter, seq=false) {
    console.log(letter);
    serverTime = syncClock.getTime();
    console.log(serverTime);
    createMediaRecorder(mediaRecorder, socket, letter, syncClock, seq);
    playSample(audioContext, buffer);
    let t1 = performance.now();

    setTimeout(() => {
        let t2 = performance.now() - t1;
        socket.transmitPublish('play', {clientID: letter, serverTime: serverTime, t2: t2});
        console.log(t2);
    }, 500);
    // createMediaRecorder(socket, letter);
    // socket.transmitPublish('finishedPlaying', letter);
}

// var clear;
var count = 0;
function send_sequence(letter) {
    count += 1;
    if (count > numTests){
        let average = (array) => array.reduce((a, b) => a + b) / array.length;
        let postData = {
            averageOperatorLag: average(users[letter].operatorLag),
            averageClientLag: average(users[letter].clientLag),
            averageDifference: average(users[letter].differences),
            clientPlatform: users[letter].platform,
            clientUA: users[letter].userAgent
        };
        $.post(serverString+"/recordTest", postData,
            function(data, response){
                console.log("Data posted");
                console.log(postData);
        });
        count = 0;
        users[letter].operatorLag = [];
        users[letter].clientLag = [];
        users[letter].differences = [];
    } else {
        send_play(letter, true);
    }
}



(async() => {
    let finished_play = socket.subscribe('finishedPlaying');
    // Send time and ID number to operator
    for await (let letter of finished_play) {
        console.log(count);
        if (count !=0 && count <= numTests){
            send_sequence(letter, true);
        }
    }
})();

(async() => {
    for await (let data of connected){
        // console.log("con" + data.socketID);
        console.log("con" + data.clientID);
        console.log(data);
        $("#buttonArea").append(`<div id="buttonArea${data.clientID}"></div>`)
        $(`#buttonArea${data.clientID}`).append(`<button class="button" onclick = "send_play('${data.clientID}')" id="${data.clientID}">Run ${data.clientID} Once</button>`);
        $(`#buttonArea${data.clientID}`).append(`<button class="button-square" onclick = "send_sequence('${data.clientID}')" id="${data.clientID}">Run ${data.clientID} Sequence</button>`);
        users[data.clientID] = {
            operatorLag: [],
            clientLag: [],
            differences: [],
            platform: "",
            userAgent: ""
        }
        
    }
})();

(async() => {
    for await (let data of disconnected){
        // console.log("dis" + data.socketID)
        console.log("dis" + data.clientID);
        $(`#buttonArea${data.clientID}`).remove();
        delete users[data.clientID];
    }
})();

var prelagSamples;
(async() => {
    for await (let data of send_time) {
        console.log(data.prelag);
        prelagSamples = data.prelag * 1000 * 44.1;
        console.log('prelag', data.prelag);
        console.log('samples', prelagSamples);
        if (users[data.clientID].userAgent == ""){
            console.log('we got here');
            users[data.clientID].userAgent = data.userAgent.ua;
            users[data.clientID].platform = data.userAgent.platform;
        }
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

