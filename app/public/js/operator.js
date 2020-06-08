var cTime, mediaRecorder, audioContext, wav;
var opt = {};

var constraints = {
  audio: {
    //sampleRate: 44100
  },
  video: false
};

var original_sound_path = 'audio/chirp.wav';

try{
  audioContext = new webkitAudioContext({sampleRate: 44100});
} catch{
  audioContext = new AudioContext({sampleRate: 44100});
}

//Create MediaRecorder
if (navigator.mediaDevices){
  navigator.mediaDevices.getUserMedia(constraints).then(function(stream){
    //send sound file as a buffer
    var buffer;
    var audio_xhr = new XMLHttpRequest();
    audio_xhr.open('GET', original_sound_path, true);
    audio_xhr.responseType = 'arraybuffer';
    audio_xhr.onload = function() {
      audioContext.decodeAudioData(audio_xhr.response, function(the_buffer){
        buffer = the_buffer;
      });
    }
    audio_xhr.send();
    
    //start recording for 500ms
    mediaRecorder = new MediaRecorder(stream, opt);
    document.getElementById('rec').onclick = function(){
      console.log('startn')
      mediaRecorder.start();
      setTimeout(() => {mediaRecorder.stop();}, 500);
    }

    let chunks = [];
    mediaRecorder.ondataavailable = function(e){
      promise = e.data.arrayBuffer();
      promise.then(value=>audioContext.decodeAudioData(value, function(theBuffer){
          wav = audioBufferToWav(theBuffer, 3);
          chunks.push(wav);
        
          //rec-recorded
          //org-original
          var rec = theBuffer.getChannelData(0);
          var org = buffer.getChannelData(0).slice(0,rec.length);

          //argMax method
          const argMax = (array) => {
          return [].reduce.call(array, (m, c, i, arr) => c > arr[m] ? i : m, 0)
          }
          //convolution method
          const conv = (vec1, vec2) => {
          if (vec1.length === 0 || vec2.length === 0) {
              throw new Error("Vectors can not be empty!");
          }
          const volume = vec1;
          const kernel = vec2;
          let displacement = 0;
          const convVec = [];

          for (let i = 0; i < volume.length; i++) {
              for (let j = 0; j < kernel.length; j++) {
              if (displacement + j !== convVec.length) {
                  convVec[displacement + j] =
                  convVec[displacement + j] + volume[i] * kernel[j];
              } else {
                  convVec.push(volume[i] * kernel[j]);
              }
              }
              displacement++;
          }

          return convVec;
          };

          org.reverse();

          let c = conv(rec, org);
          let am = argMax(c);
          let lag = am - rec.length + 1;
          document.getElementById("time").innerHTML += '<br><b> lag: ' + lag + '<b><br>';
          console.log("lag: " + lag);

          const blob = new Blob(chunks, {'type': 'audio/wav'});
          chunks = [];

          // download audio file
          var element = document. getElementById("downloadlink");
          element. parentNode. removeChild(element);
          const audioURL = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = audioURL;
          a.download = 'output';
          a.setAttribute("id", "downloadlink");
          a.innerHTML = "download sound file";
          document.getElementsByClassName("container")[0].appendChild(a);
          // a.click();
      }))            
    }

    mediaRecorder.onstop = function(e) {

    }
  });

}

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
function send_play() {
    document.getElementById("time").innerHTML = "";
    cTime = Date.now();
    socket.publish('play');
}

(async() => {
    for await (let data of connected){
        console.log("con" + data.clientID);
        console.log(data);
    }
})();

(async() => {
    for await (let idNumber of disconnected){
        console.log("dis" + idNumber)
        console.log(idNumber);
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

