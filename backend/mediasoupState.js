// mediasoupState.js
module.exports = {
  producers: {},       // { roomId: { video, audio } }
  clientTransports: {},// { socketId: { producer, consumers[] } }
  roomViewers: {}      // { roomId: Set<socketId> }
};
