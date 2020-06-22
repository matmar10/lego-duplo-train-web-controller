'use strict';
$(function() {
  $('#btn-fwd').click(function() {
    $.websocketSend([{
      type: 'device',
      name: 'motor',
      method: 'setPower',
      args: [50]
    }, {
      type: 'device',
      name: 'hub',
      method: 'sleep',
      args: [10000]
    }])
  });
  $('#btn-stop').click(function() {
    $.websocketSend([{
      type: 'device',
      name: 'motor',
      method: 'setPower',
      args: [0]
    }])
  });
  $('#btn-back').click(function() {
    $.websocketSend([{
      type: 'device',
      name: 'motor',
      method: 'setPower',
      args: [-50]
    }, {
      type: 'device',
      name: 'hub',
      method: 'sleep',
      args: [10000]
    }])
  });
});
