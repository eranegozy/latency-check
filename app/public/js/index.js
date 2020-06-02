const num = Math.floor(Math.random()*1000000);
const audio_filename = 'audio/chirp.wav';
const nav = {
    num: num,
    codename: navigator.appCodeName,
    name: navigator.appName,
    version: navigator.appVersion,
    platform: navigator.platform,
    ua: navigator.userAgent
};
document.getElementById('id_num').innerHTML += num;

var xhr = new XMLHttpRequest();
xhr.open("POST", '/ua');
xhr.setRequestHeader('Content-Type', 'application/json');
xhr.send(JSON.stringify(nav));

// Setup audio context
var audioContext, buffer;
try{
    audioContext = new webkitAudioContext();
} catch{
    audioContext = new AudioContext();
}

window.onerror = function (msg, url, lineNo, columnNo, error) {
    document.getElementById('e_msg').innerHTML += msg + "<br>";
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

function playSound(){
    if (audioContext.state == 'suspended'){
        audioContext.resume();
    }
    playSample(audioContext, buffer);
    // console.log(audioContext.outputLatency);
    d = new Date();
    // Update page with last time button was hit
    document.getElementById('msg').innerHTML = d.toTimeString();
}

function playSample(audioContext, audioBuffer) {
    const sampleSource = audioContext.createBufferSource();
    sampleSource.buffer = audioBuffer;
    sampleSource.connect(audioContext.destination)
    sampleSource.start();
    return sampleSource;
}

const playButton = document.querySelector('button');
playButton.addEventListener('click', function() {
    playSound()
}, false);

//SOCKET CLUSTER
const options = {
    // secure: true,
    // hostname: 'localhost',
    port: 8000,
    // See https://socketcluster.io/#!/docs/api-socketcluster-client for all available options
};

const socket = socketCluster.create(options);

var recieved_play = socket.subscribe('play');

// Send time and ID number to operator
recieved_play.watch(function (sound){
    console.log(sound);
    let now = Date.now();
    playSound();
    socket.publish('send_time', {time: now, id: num});
});

// Add errors on page
socket.on('error', function (err) {
    console.error(err);
    document.getElementById('e_msg').innerHTML += err + '<br>';
    document.getElementById('e_msg').innerHTML += "refresh the page <br>";

});

socket.on('connect', function () {
    console.log('Socket is connected');
});

socket.on('subscribe', function (channelName) {
    console.log(`Socket is subscribed to ${channelName}`);
});