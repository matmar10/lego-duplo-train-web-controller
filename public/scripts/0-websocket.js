'use strict';

$(function() {
  var subscribers = {};
  $.websocketAddSubscriber = function(type, fn) {
    subscribers[type] = fn;
    console.info('Added new subscriber for ' + type);
  };

  $.websocketSend = function(params) {
    ws.send(JSON.stringify(params, null, 2));
  };

  var HOST = location.origin.replace(/^http/, 'ws')
  window.ws = new WebSocket(HOST);
  window.ws.onmessage = function (event) {
    if (!event.data) {
      return;
    }
    try {
      var parsed = JSON.parse(event.data);
      if (parsed.type) {
        console.info('Received payload for type \'' + parsed.type + '\'', parsed);
        subscribers[parsed.type](parsed);
      } else {
        console.log('Unknown type for websocket payload:', parsed);
      }
    } catch (err) {
      console.error('Error parsing JSON:', err);
    }
  };
});
