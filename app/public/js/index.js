const audio_filename = 'audio/chirp.wav';
var nav = {
    platform: navigator.platform,
    ua: navigator.userAgent
};

//add sound device info if possible
if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
    console.log("enumerateDevices() not supported.");
    nav.sound_device = 'unknown';
}
else {
    console.log(navigator.mediaDevices);
    navigator.mediaDevices.enumerateDevices()
    .then(function(devices) {
        // console.log(devices)
    devices.forEach(function(device) {
        // console.log(device.deviceId);
        if (device.deviceId == 'default' && device.kind == 'audiooutput')
            nav.sound_device = device.label.slice(10, device.label.length);
    });
    })
    .catch(function(err) {
    console.log(err.name + ": " + err.message);
    nav.sound_device = 'unknown';
    });
}

// Setup audio context
var audioContext, buffer;
try{
    audioContext = new webkitAudioContext();
} catch{
    audioContext = new AudioContext();
}

//print error on screen
window.onerror = function (msg, url, lineNo, columnNo, error) {
    document.getElementById('e_msg').innerHTML = msg + "<br>";
    document.getElementById('e_msg').innerHTML += "refresh the page <br>";
};

// Send audio using WebAudioAPI
var audio_xhr = new XMLHttpRequest();
audio_xhr.open('GET', audio_filename, true);
audio_xhr.responseType = 'arraybuffer';
audio_xhr.onload = function() {
    audioContext.decodeAudioData(audio_xhr.response, function(theBuffer){
        buffer = theBuffer;
    });
}

audio_xhr.send();

const track = audioContext.createBufferSource();
track.buffer = buffer;
track.connect(audioContext.destination);

function changePage(){
    document.getElementById("content").style = "display: show";
    document.getElementById("intro").style = "display: none";
}

function playSound(){
    if (audioContext.state == 'suspended'){
        audioContext.resume();
    }
    playSample(audioContext, buffer);
    // console.log(audioContext.outputLatency);
    d = new Date();
    // Update page with last time button was hit
    document.getElementById('msg1').innerHTML = "sound played at<br>" + d.toTimeString();
    document.getElementById('msg2').innerHTML = "sound played at<br>" + d.toTimeString();
    if (num == socket.id){
        console.log("fist clrick");
        socket.transmit("firstClick", nav);
    }
}

function playSample(audioContext, audioBuffer) {
    const sampleSource = audioContext.createBufferSource();
    sampleSource.buffer = audioBuffer;
    sampleSource.connect(audioContext.destination)
    sampleSource.start();
    return sampleSource;
}



//SOCKET CLUSTER
const options = {
    // secure: true,
    // hostname: 'localhost',
    // port: 8000
    // See https://socketcluster.io/#!/docs/api-socketcluster-client for all available options
};

const socket = socketClusterClient.create(options);
var syncClock;
requirejs(["js/syncclock"], function(clock) {
    syncClock = new clock.SyncClock(socket);
});

//global clock
function updateTime(){
    if (syncClock != null)
        document.getElementById('time').innerHTML = syncClock.getTime().toFixed(3);
}
setInterval(updateTime, 1);

let num;
const playButton = document.querySelector('.button');
playButton.addEventListener('click', function() {
    if (document.getElementById("soundButton").className != "dead_button"){
        playSound();
    }
}, false);

//on play received from the operator
(async() => {
    let recieved_play = socket.subscribe('play');
    for await (let data of recieved_play) {
        if (data.clientID == num){
            //calculate latency
            let playTime = syncClock.getTime();
            let prelag = playTime-data.serverTime-(data.t2/1000);
            // console.log(playTime);
            // console.log(data.serverTime);
            // console.log(prelag);
            document.getElementById("soundButton").className = "dead_button";
            socket.transmitPublish('send_time', {
                clientID: data.clientID, 
                prelag: prelag, 
                playTime: playTime, 
                userAgent: nav
            });
            playSound();
        }
    }
})();

// on all calculations finished on the operator side
(async() => {
    let finished_play = socket.subscribe('finishedPlaying');
    // Send time and ID number to operator
    for await (let idNumber of finished_play) {
        if (idNumber == num){
            document.getElementById("soundButton").className = "button";
        }
    }
})();

(async() => {
    let updateID = socket.subscribe('updateID');
    // Send time and ID number to operator
    
    for await (let data of updateID) {
        if (data.socketID == socket.id){
            num = data.clientID;
            document.getElementById("id_num").innerHTML = "Client ID: " + num;
        }
    }
})();

(async() => {
    // Add errors on page
    for await (let err of socket.listener('error')) {
        // socket.publish('removeButton', {id:num, err:err});
        console.error(err);
        document.getElementById('e_msg').innerHTML = err + '<br>';
        document.getElementById('e_msg').innerHTML += "refresh the page <br>";   
    }
})();

(async() => {
    for await (let data of socket.listener('connect')) {
        console.log('Socket is connected');
        document.getElementById('e_msg').innerHTML = "";
        document.getElementById("id_num").innerHTML = `#${socket.id}`;
        num = socket.id;
    }
})();

(async() => {
    for await (let channel of socket.listener('subscribe')) {
        console.log(`Socket is subscribed to ${channel.channel}`);
    }
})();

// DEBUG 
// print out data on connect and disconnect
// (async() => {
//     for await (let data of socket.listener('disconnect')){
//         console.log("help Im gone now");
//         // socket.transmit('removeButton');
//     }
// })();

// (async () => {
//     let connected = socket.subscribe("connected");
//     console.log("help im tryung to connect")
//     for await (let data of connected){
//         console.log(data);
//     }
// })();
