var cTime, audioContext, wav;
var opt = {};

const original_sound_path = 'audio/chirp.wav';

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
let average = (array) => array.reduce((a, b) => a + b) / array.length;
// Hardcoded recorder to run for recordLength*2 milliseconds
function createMediaRecorder(mediaRecorder, socket, letter, syncClock, seq, recordLength){
    //Create MediaRecorder
    // if (navigator.mediaDevices){
    //     navigator.mediaDevices.getUserMedia(constraints).then(function(stream){

            //start recording for (recordLength * 2) ms
            console.log('starting Media Recorder')
            mediaRecorder.start();

            setTimeout(() => {mediaRecorder.stop();}, recordLength*2);
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
                    let rec = theBuffer.getChannelData(0);
                    let halfTime = recordLength * 44.1
                    let firstHalf = rec.slice(0, halfTime);
                    let secondHalf = rec.slice(halfTime+1, rec.length);

                    let org = buffer.getChannelData(0);
                    if (org.length > firstHalf.length){
                        org = org.slice(0,firstHalf.length);
                    }
                    else{
                        firstHalf = firstHalf.slice(0, org.length);
                        secondHalf = secondHalf.slice(0, org.length);
                    }
                    org.reverse();

                    // calculate xcorr of both first half and second half
                    // then compare
                    let c1 = conv(firstHalf, org);
                    let c2 = conv(secondHalf, org);
                    let am1 = argMax(c1);
                    let am2 = argMax(c2);
                    console.log('Calculation Finished')
                    let lag1 = am1 - org.length + 1;
                    let lag2 = am2 - org.length + 1;

                    //convert samples to ms
                    lag1 = lag1 / 44.1;
                    lag2 = lag2 / 44.1;
                    document.getElementById(`buttonArea${letter}times`).innerHTML = '<br><b> operatorLag: ' + lag1.toFixed(3) + 'ms<b><br>';

                    document.getElementById(`buttonArea${letter}times`).innerHTML += '<br><b> clientLag: ' + lag2.toFixed(3) + 'ms<b><br>';

                    document.getElementById(`buttonArea${letter}times`).innerHTML += '<br><b> difference: ' + Math.abs((Math.abs(lag1-lag2) - prelagMS)).toFixed(3) + 'ms<b><br>';

                    console.log("oLag: " + lag1);

                    console.log("cLag: " + lag2);

                    if (seq) {
                        console.log(users);
                        users[letter].operatorLag.push(lag1);
                        users[letter].clientLag.push(lag2);
                        users[letter].differences.push(Math.abs((Math.abs(lag1-lag2) - prelagMS)));
                    }
                    users[letter].averageDifferences.push(Math.abs((Math.abs(lag1-lag2) - prelagMS)));
                    document.getElementById(`buttonArea${letter}times`).innerHTML += '<br><b> accumulated average difference: ' + average(users[letter].averageDifferences).toFixed(3)+'ms</b><br>'
                    console.log("difference-delay: " + Math.abs((Math.abs(lag1-lag2)-prelagMS)));
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

                    socket.transmitPublish("finishedPlaying", letter)
                    console.log("All Done");
                })); 
            }

}
