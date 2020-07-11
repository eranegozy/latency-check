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

function createMediaRecorder(mediaRecorder, socket, letter){
    //Create MediaRecorder
    // if (navigator.mediaDevices){
    //     navigator.mediaDevices.getUserMedia(constraints).then(function(stream){

            //start recording for 500ms
            
            console.log('starting Media Recorder')
            mediaRecorder.start();
            setTimeout(() => {mediaRecorder.stop();}, 1000);
            let chunks = [];

            mediaRecorder.ondataavailable = function(e){
                console.log('Data Available');
                promise = e.data.arrayBuffer();
            }

            mediaRecorder.onstop = function(e) {

       
                promise.then(value=>audioContext.decodeAudioData(value, function(theBuffer){
                    wav = audioBufferToWav(theBuffer, 3);
                    chunks.push(wav);
                    //21167
                    //42335
                    //rec-recorded
                    //org-original
                    var rec = theBuffer.getChannelData(0);
                    var firstHalf = rec.slice(0, 21167);
                    var secondHalf = rec.slice(21168, rec.length);
                    console.log(firstHalf.length);
                    console.log(secondHalf.length);
                    
                    var org = buffer.getChannelData(0).slice(0,firstHalf.length);
                    
                    org.reverse();

                    let c1 = conv(firstHalf, org);
                    let c2 = conv(secondHalf, org);
                    let am1 = argMax(c1);
                    let am2 = argMax(c2);
                    console.log('Calculation Finished')
                    let lag1 = am1 - org.length + 1;
                    let lag2 = am2 - org.length + 1;
                    document.getElementById("lag_time").innerHTML += '<br><b> lag: ' + lag1 + '<b><br>';
                    document.getElementById("lag_time").innerHTML += '<br><b> adjusted lag: ' + (lag1-prelagSamples) + '<b><br>';

                    document.getElementById("lag_time").innerHTML += '<br><b> lag: ' + lag2 + '<b><br>';
                    document.getElementById("lag_time").innerHTML += '<br><b> adjusted lag: ' + (lag2-prelagSamples) + '<b><br>';

                    console.log("lag: " + lag1);
                    console.log("adjusted lag: " + (lag1-prelagSamples));

                    console.log("lag: " + lag2);
                    console.log("adjusted lag: " + (lag2-prelagSamples));

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
                    document.getElementById("lag_time").appendChild(a);
                    // document.getElementsByClassName("container")[0].appendChild(a);

                    socket.transmitPublish("finishedPlaying", letter)
                    console.log("All Done");
                    // a.click();
                })); 
            }
        // });

    // }
}
