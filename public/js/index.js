window.onload = function(){
  window.onbeforeunload = function(e) {
    hangup();
  }
  var socket = io('/videochat');
  var room = 'chatroom';
  var configuration = {
    'iceServers': [
    {
      'url': 'stun:stun01.sipphone.com'
    },
    {
      'url': 'turn:192.158.29.39:3478?transport=udp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    },
    {
      'url': 'turn:192.158.29.39:3478?transport=tcp',
      'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
      'username': '28224511:1379330808'
    }
  ]
}
  var constraints = {audio: true, video: {width: { min: 1280, ideal: 1280 }, height: { min: 720, ideal: 720 }, frameRate: { ideal: 15, max: 30 } }};
  var localVideo = document.getElementById("localVideo"); 
  var remoteVideo = document.getElementById("remoteVideo");
  var startButton = document.getElementById("startButton");
  var callButton = document.getElementById("callButton");
  var hangupButton = document.getElementById("hangupButton");
  var remote = false //false for local connection
  var localStream, pc;

  startButton.disabled = true;
  callButton.disabled = true;
  hangupButton.disabled = true;
  startButton.onclick = start;
  callButton.onclick = call;
  hangupButton.onclick = hangup;

  function start() {
    startButton.disabled = true;
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
    if(startButton.disabled = false) {
      start();
      startButton.click();
    }
    callButton.disabled = true;
    hangupButton.disabled = false;
    if(!remote) 
      socket.emit('call', "A user has placed call to you");

    console.log("processing call");
    if (localStream.getVideoTracks().length > 0) {
        console.log('Using video device: ' + localStream.getVideoTracks()[0].label);
    }
    if (localStream.getAudioTracks().length > 0) {
        console.log('Using audio device: ' + localStream.getAudioTracks()[0].label);
    }
    createPeerConnection()
  }
  function createPeerConnection() {
    pc = new RTCPeerConnection(configuration);
    console.log("Created a peer connection");
    try {
      localStream.getTracks().forEach(track => pc.addTrack(track, localStream))
    } catch(err) {
      console.log(err + " ...using deprecated method instead")
      pc.addStream(localStream);
    }
    console.log("Added a stream to peer connection");
    if(!remote) {
    pc.onicecandidate = gotIceCandidate;
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
  function gotIceCandidate(event){
      if(event.candidate) {
        sendMessage({type: 'candidate', candidate: event.candidate.candidate});
        console.log("Sent ICE candidates to peer: \n" + event.candidate.candidate);
      }
  };
  function answerCall() {
    pc.createAnswer()
    .then(function(description){
      pc.setLocalDescription(description);
      console.log("set local description")
      sendMessage(description);
      console.log("Sent answer to peer: \n" + description.sdp);
    })
  }
  /*function gotRemoteIceCandidate(event){
        if(event.candidate) {
          console.log("Obtained new Ice Candidate: " + event.candidate)
          pc.addIceCandidate(new RTCIceCandidate(event.candidate));
          console.log("Sent ICE candidate from RemotePeerC:" + event.candidate.candidate);
          sendMessage({type: 'candidate', candidate: event.candidate.candidate});
        }
    };*/
  function sendMessage(data) {
    socket.emit('data', data)
  }
  function hangup() {
    console.log("Ending call");
    hangupButton.disabled = true;
    pc.close();
    pc = null;
    socket.emit('hangup', "user has ended the call")
  } 
//users may not run call() until both users have ran start().
  socket.on('connect', function(){
    socket.emit('room', room)
  });
  socket.on('started', function(evt) {
    if(evt.disconnected) {
      startButton.disabled = true
      console.log("Less than two users connected: " + evt.disconnected)
    } else {
      if(localStream === undefined) {
      startButton.disabled = false
      }
    }
  });
  socket.on('start', function (evt) {
    console.log(evt)
    if(evt.disconnected) {
      callButton.disabled = true
    } else if(startButton.disabled) {
      callButton.disabled = false
    };
  })
  socket.on('call', function(evt) {
    console.log(evt);
    remote = true
    call();
  });
  socket.on('data', function(data) {
      if(data.type !== 'candidate') {
        if(remote) {
          pc.setRemoteDescription(data)
          answerCall();
          pc.onaddstream = function(event) {
            remoteVideo.srcObject = event.stream;
          }
        }
        if(!remote) {
          pc.setRemoteDescription(data)
          pc.onaddstream = function(event) {
            remoteVideo.srcObject = event.stream;
          }
        }
      }
//This actually occurs prior to setting remote description on "!remote" immediately after !remote sets local description. 
      if(remote) {
        if(data.type === 'candidate') {
            console.log("Received and added " + data.candidate)
            pc.addIceCandidate(new RTCIceCandidate(data))
          }
      }
  });
  socket.on('hangup', function(evt) {
    console.log(evt)
  });
};