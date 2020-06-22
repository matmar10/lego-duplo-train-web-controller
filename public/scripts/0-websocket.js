'use strict';

$(function() {
  var subscribers = {};
  $.websocketAddSubscriber = function(type, fn) {
    console.info('Added new subscriber for ' + type);
    subscribers[keyword] = fn;
  };

  $.websocketSend = function(params) {
    ws.send(JSON.stringify(params, null, 2));
  };

  var HOST = location.origin.replace(/^http/, 'ws')
  var ws = new WebSocket(HOST);
  ws.onmessage = function (event) {
    try {
      var parsed = JSON.parse(event);
      if (parsed.type) {
        console.info('Received payload for type \'' + parsed.type + '\'', parsed);
        subscribers[keyword](parsed);
      } else {
        console.log('Unknown type for websocket payload:', parsed);
      }
    } catch (err) {
      console.error('Error parsing JSON:', err);
    }
  };
});
