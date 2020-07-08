var original_sound_path = 'audio/chirp.wav';

try
{
    audioContext = new webkitAudioContext({sampleRate: 44100});
} 
catch
{
    audioContext = new AudioContext({sampleRate: 44100});
}
var input;
var recorder;
if (navigator.mediaDevices){
    navigator.mediaDevices.getUserMedia(constraints).then(
        function(stream){
            input = audioContext.createMediaStreamSource(stream);
            // console.log(input);
            recorder = new WebAudioRecorder(input, {workerDir: "js/web-audio-recorder-js-master/lib/"});
            recorder.setOptions({timeLimit: 0.5})
        }
    )}

 

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

function createMediaRecorder(socket, letter){
    console.log('recc started');
    recorder.startRecording();
    setTimeout(() => {recorder.finishRecording();}, 500);
    recorder.onComplete = function(recorder, blob){
        console.log(recorder);
        console.log(blob);
        const promise = new Response(blob).arrayBuffer();
        console.log(promise);

        promise.then(value=>audioContext.decodeAudioData(value, function(theBuffer){
            // wav = audioBufferToWav(theBuffer, 3);
            // chunks.push(wav);
            
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
            console.log("adjusted lag: " + (lag-prelagSamples));
        }));

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
    }
    
}