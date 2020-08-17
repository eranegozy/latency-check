//add jquery
var script = document.createElement('script');
script.src = 'https://code.jquery.com/jquery-3.4.1.min.js';
script.type = 'text/javascript';
document.getElementsByTagName('head')[0].appendChild(script);

const audio_filename = 'audio/chirp.wav';
const serverString = window.location.origin;
const numTests = 3;

var users = {}
var mediaRecorder;
var constraints = {
    audio: {
      //sampleRate: 44100
    },
    video: false
  };
var opt = {};

// setup the media recorder
if (navigator.mediaDevices){
    navigator.mediaDevices.getUserMedia(constraints).then(
        function(stream){
            mediaRecorder = new MediaRecorder(stream, opt);
        }
    )
} else {
    console.log("media devices not supported")
}

const options = {
  // secure: true,
  // hostname: 'localhost',
  // port: 8000,
  // See https://socketcluster.io/#!/docs/api-socketcluster-client for all available options
};
const socket = socketClusterClient.create(options);

var syncClock;
requirejs(["js/syncclock"], function(clock) {
    syncClock = new clock.SyncClock(socket);
});

// global clock
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

// setup recorder
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
// Hardcoded 250ms pause
function send_play(letter, seq=false) {
    let length = 250;
    console.log(letter);
    serverTime = syncClock.getTime();
    createMediaRecorder(mediaRecorder, socket, letter, syncClock, seq, length);
    playSample(audioContext, buffer);
    let t1 = performance.now();

    setTimeout(() => {
        let t2 = performance.now() - t1;
        socket.transmitPublish('play', {clientID: letter, serverTime: serverTime, t2: t2});
    }, length);
}

var count = 0;
// Send play command to the client numTests times
// Then post data to database
function send_sequence(letter) {
    count += 1;
    if (count > numTests){
        let average = (array) => array.reduce((a, b) => a + b) / array.length;
        let postData = {
            averageOperatorLag: average(users[letter].operatorLag).toFixed(3),
            averageClientLag: average(users[letter].clientLag).toFixed(3),
            averageDifference: average(users[letter].differences).toFixed(3),
            clientPlatform: users[letter].platform,
            clientUA: users[letter].userAgent,
            clientSoundDevice: users[letter].soundDevice
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

// Continue sequence if not done
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

// on connect create buttons for site and add client to dict
(async() => {
    for await (let data of connected){
        // console.log("con" + data.socketID);
        // console.log("con" + data.clientID);
        // console.log(data);
        let clientUA = data.userAgent.ua.slice(data.userAgent.ua.indexOf('('), data.userAgent.ua.indexOf(')')+1);
        $("#buttonArea").append(`<div id="buttonArea${data.clientID}"></div>`)
        $(`#buttonArea${data.clientID}`).append(`<p>${clientUA}</p>`);
        $(`#buttonArea${data.clientID}`).append(`<button class="button" onclick = "send_play('${data.clientID}')" id="${data.clientID}">Run ${data.clientID} Once</button>`);
        $(`#buttonArea${data.clientID}`).append(`<button class="button-square" onclick = "send_sequence('${data.clientID}')" id="${data.clientID}">Run ${data.clientID} Sequence</button>`);
        $(`#buttonArea${data.clientID}`).append(`<div id="buttonArea${data.clientID}times"></div>`);
        users[data.clientID] = {
            operatorLag: [],
            clientLag: [],
            differences: [],
            averageDifferences: [],
            platform: data.userAgent.platform,
            userAgent: data.userAgent.ua,
            soundDevice: data.userAgent.sound_device
        }
        
    }
})();

// on disconnect, remove buttons and remove client from dict
(async() => {
    for await (let data of disconnected){
        // console.log("dis" + data.socketID)
        // console.log("dis" + data.clientID);
        $(`#buttonArea${data.clientID}`).remove();
        delete users[data.clientID];
    }
})();

// set variable prelagMS for another file to use
var prelagMS;
(async() => {
    for await (let data of send_time) {
        prelagMS = data.prelag * 1000;
        if (users[data.clientID].userAgent == ""){
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

