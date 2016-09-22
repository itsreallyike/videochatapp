window.onload = function(){
  window.onbeforeunload = function(e) {
    hangup();
  }
  var socket = io('/videochat');
  var room = 'chatroom';
  var configuration = {
    'iceServers': [
    {
      'url': 'stun:stun.stunprotocol.org'
    },
    {
      'url': 'turn:turn.meetme.id:443',
      'credential': 'public',
      'username': 'public'
    },
    {
      'url': 'turn:turn.meetme.id:443',
      'credential': 'public',
      'username': 'public'
    }
  ]
}
  var constraints = {audio: true, video: {width: { max: 1280, ideal: 1280 }, height: { max: 720, ideal: 720 }, frameRate: { ideal: 15, max: 30 } }};
  var localVideo = document.getElementById("localVideo"); 
  var remoteVideo = document.getElementById("remoteVideo");
  var startButton = document.getElementById("startButton");
  var callButton = document.getElementById("callButton");
  var hangupButton = document.getElementById("hangupButton");
  var waiting = document.getElementById("waiting")
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
      pc.setLocalDescription(description, function() {
        console.log("set local description")
        sendMessage(JSON.stringify({
        'sdp': pc.localDescription}));
      });
      console.log("Sent offer to peer, description: " + JSON.stringify(pc.localDescription));
    });
  };
  function gotIceCandidate(event){
      if(event.candidate) {
        sendMessage(JSON.stringify({'candidate': event.candidate}));
        console.log("Sent ICE candidates to peer: \n" + JSON.stringify(event.candidate));
      }
  };
  function answerCall() {
    pc.createAnswer()
    .then(function(description){
      pc.setLocalDescription(description, function() {
        console.log("set local description")
        sendMessage(JSON.stringify({
        'sdp': pc.localDescription}));
      });
      console.log("Sent answer to peer, description: " + JSON.stringify(pc.localDescription));
    });;
  }
  function sendMessage(data) {
    socket.emit('data', data)
  }
  function hangup() {
    console.log("Ending call");
    hangupButton.disabled = true;
    pc.close();
    pc = null;
    remoteVideo.srcObject = null;
    socket.emit('hangup', "user has ended the call")
  } 
//users may not run call() until both users have ran start().
  socket.on('connect', function(){
    socket.emit('room', room)
  });
  socket.on('started', function(evt) {
    if(evt.disconnected) {
      startButton.disabled = true
      waiting.style.display = "inline"
      console.log("Less than two users connected: " + evt.disconnected)
    } else if(localStream === undefined) {
      startButton.disabled = false
      waiting.style.display = "none"
    }
  });
  socket.on('start', function (evt) {
    console.log(evt)
    if(evt.disconnected) {
      callButton.disabled = true
    } else if(startButton.disabled) {
      callButton.disabled = false
      waiting.style.display = "none"
    };
  })
  socket.on('call', function(evt) {
    console.log(evt);
    remote = true
    call();
  });
  socket.on('data', function(data) {
      var message = JSON.parse(data)
      if(message.candidate && remote) {
        console.log("Received and added " + JSON.stringify(message.candidate))
        pc.addIceCandidate(new RTCIceCandidate(message.candidate))
      }
      if(message.sdp) {
        if(remote) {
          pc.setRemoteDescription(message.sdp)
          answerCall();
          pc.onaddstream = function(event) {
            remoteVideo.srcObject = event.stream;
          }
        }
        if(!remote) {
          pc.setRemoteDescription(message.sdp)
          pc.onaddstream = function(event) {
            remoteVideo.srcObject = event.stream;
          }
        }
      }
  });
  socket.on('hangup', function(evt) {
    console.log(evt)
    hangupButton.disabled = true;
    pc.close();
    pc = null;
    remoteVideo.srcObject = null;
  });
};