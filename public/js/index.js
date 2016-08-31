window.onload = function(){
  window.onbeforeunload = function(e) {
    hangup();
  }
  var socket = io();
  var constraints = {video: true, audio: true};
  var localVideo = document.getElementById("localVideo"); 
  var remoteVideo = document.getElementById("remoteVideo");
  var startButton = document.getElementById("startButton");
  var callButton = document.getElementById("callButton");
  var hangupButton = document.getElementById("hangupButton");
  var remote = false //false for local connection
  var localStream, pc;

  startButton.disabled=false;
  callButton.disabled = true;
  hangupButton.disabled = true;
  startButton.onclick = start;
  callButton.onclick = call;
  hangupButton.onclick = hangup;

  function start() {
    startButton.disabled = true;
    callButton.disabled = false;
    navigator.mediaDevices.getUserMedia(constraints)
    .then(function(mediaStream) {
        localVideo.src = window.URL.createObjectURL(mediaStream);
        localStream = mediaStream;
    })
    .catch(function(error) {
        console.log(error.name + " - " + error.message)
    });
    socket.emit('start', "Ready to place a call");
  }
  function call() {
    if(!remote) 
      socket.emit('call', "A user has placed call to you");

    console.log("processing call");
    callButton.disabled = true;
    hangupButton.disabled = false;
    if (localStream.getVideoTracks().length > 0) {
        console.log('Using video device: ' + localStream.getVideoTracks()[0].label);
    }
    if (localStream.getAudioTracks().length > 0) {
        console.log('Using audio device: ' + localStream.getAudioTracks()[0].label);
    }
    createPeerConnection()
  }
  function createPeerConnection() {
    pc = new RTCPeerConnection();
    console.log("Created a peer connection");
    try {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
    } catch(err) {
      console.log(err + " ...using deprecated method instead")
      pc.addStream(localStream);
    }
    console.log("Added a stream to peer connection");
    if(!remote) {
    offer();
    }
  };
  function offer() {
    pc.createOffer()
    .then(function(description){
      pc.setLocalDescription(description);
      console.log("set local description")
      sendMessage(description);
      console.log("Sent offer to peer" + description.sdp);
    });
  };
  // This is useful if I decide to switch to trickle approach. For now, sending ICE from local via descriptions sdp only.
  /*function gotIceCandidate(event){
      if(event.candidate) {
        pc.addIceCandidate(new RTCIceCandidate(event.candidate));
        sendMessage({type: 'candidate', candidate: event.candidate.candidate});
        console.log("Sent ICE candidates to peer: \n" + event.candidate.candidate);
      }
  }; */
  function answerCall() {
    pc.createAnswer()
    .then(function(description){
      pc.setLocalDescription(description);
      console.log("set local description")
      sendMessage(description);
      console.log("Sent answer to peer: \n" + description.sdp);
    })
  }
  function gotRemoteIceCandidate(event){
        if(event.candidate) {
          console.log("Obtained new Ice Candidate: " + event.candidate)
          pc.addIceCandidate(new RTCIceCandidate(event.candidate));
          console.log("Sent ICE candidate from RemotePeerC:" + event.candidate.candidate);
          sendMessage({type: 'candidate', candidate: event.candidate.candidate});
        }
    };
  function sendMessage(data) {
    socket.emit('data', data)
  }
  function hangup() {
    console.log("Ending call");
    hangupButton.disabled = true;
    callButton.disabled = false;
    pc.close();
    pc = null;
    socket.emit('hangup', "user has ended the call")
  } 
//users may not run call() until both users have ran start().
  socket.on('start', function(evt) {
    console.log(evt)
  });
  socket.on('call', function(evt) {
    console.log(evt);
    remote = true
    call();
  });
  socket.on('data', function(data) {
      if(data.type !== 'candidate') {
        if(remote) {
          pc.setRemoteDescription(data)
          pc.onicecandidate = gotRemoteIceCandidate;
          pc.onaddstream = function(event) {
            remoteVideo.srcObject = event.stream;
          }
          answerCall();
        }
        if(!remote) {
          pc.setRemoteDescription(data)
          pc.onaddstream = function(event) {
            remoteVideo.srcObject = event.stream;
          }
        }
      }
//This actually occurs prior to setting remote description on "!remote" after "remote" runs gotRemoteIceCandidate. 
        if(!remote) {
          if(data.type === 'candidate') {
            console.log(data.candidate)
            pc.addIceCandidate(new RTCIceCandidate(data))
          }
        }
  });
  socket.on('hangup', function(evt) {
    console.log(evt)
  });
};