var cTime, audioContext, wav;
var opt = {};

// var constraints = {
//   audio: {
//     //sampleRate: 44100
//   },
//   video: false
// };

var original_sound_path = 'audio/chirp.wav';

try{
  audioContext = new webkitAudioContext({sampleRate: 44100});
} catch{
  audioContext = new AudioContext({sampleRate: 44100});
}

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

function createMediaRecorder(mediaRecorder, socket, letter){
    //Create MediaRecorder
    // if (navigator.mediaDevices){
    //     navigator.mediaDevices.getUserMedia(constraints).then(function(stream){

            //start recording for 500ms
            
            console.log('starting Media Recorder')
            mediaRecorder.start();
            setTimeout(() => {mediaRecorder.stop();}, 500);
            let chunks = [];

            mediaRecorder.ondataavailable = function(e){
                console.log('Data Available');
                promise = e.data.arrayBuffer();
            }

            mediaRecorder.onstop = function(e) {

       
                promise.then(value=>audioContext.decodeAudioData(value, function(theBuffer){
                    wav = audioBufferToWav(theBuffer, 3);
                    chunks.push(wav);
                    
                    //rec-recorded
                    //org-original
                    var rec = theBuffer.getChannelData(0);
                    var org = buffer.getChannelData(0).slice(0,rec.length);
                    
                    org.reverse();

                    let c = conv(rec, org);
                    let am = argMax(c);
                    console.log('Calculation Finished')
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
                    socket.transmitPublish("finishedPlaying", letter)
                    console.log("All Done");
                    // a.click();
                })); 
            }
        // });

    // }
}
