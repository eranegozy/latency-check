// const num = Math.floor(Math.random()*1000000);
const audio_filename = 'audio/chirp.wav';
const nav = {
    // num: num,
    codename: navigator.appCodeName,
    name: navigator.appName,
    version: navigator.appVersion,
    platform: navigator.platform,
    ua: navigator.userAgent
};


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
        socket.transmit("firstClick");
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
    port: 8000
    // See https://socketcluster.io/#!/docs/api-socketcluster-client for all available options
};

const socket = socketClusterClient.create(options);
let num;
const playButton = document.querySelector('.button');
playButton.addEventListener('click', function() {
    playSound();
    if (num == socket.id){
        console.log("fist clrick");
        socket.transmit("firstClick");
    }
}, false);

(async() => {
    let recieved_play = socket.subscribe('play');
    // Send time and ID number to operator
    for await (let idNumber of recieved_play) {
        let now = Date.now();
        console.log(idNumber);
        console.log(num);
        if (idNumber == num){
            playSound();
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
        document.getElementById('e_msg').innerHTML += err + '<br>';
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

(async() => {
    for await (let data of socket.listener('disconnect')){
        console.log("help Im gone now");
        // socket.transmit('removeButton');
    }
})();

(async () => {
    let connected = socket.subscribe("connected");
    console.log("help im tryung to connect")
    for await (let data of connected){
        console.log(data);
    }
})();
