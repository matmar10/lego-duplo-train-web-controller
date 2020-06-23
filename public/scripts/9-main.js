'use strict';
$(function() {

  var $speed = $('#speed');
  var $power = $('#power');

  function setPower(speed, noChange) {
    if (!noChange) {
      $power.val(speed);
      $power.trigger('change');
    }
    $.websocketSend([{
      type: 'device',
      name: 'motor',
      method: 'setPower',
      args: [speed]
    }, {
      type: 'device',
      name: 'hub',
      method: 'sleep',
      args: [10000]
    }]);
  }

  $.websocketAddSubscriber('speed', function(ev) {
    $speed.val(Math.abs(ev.data.speed));
    $speed.trigger('change');
  });

  $power.on('change', function(ev) {
    var speed = $power.val();
    setPower(speed, true);
  });

  $('#btn-fwd').click(function() {
    setPower(50);
  });
  $('#btn-stop').click(function() {
    setPower(0);
  });
  $('#btn-back').click(function() {
    setPower(-50);
  });

	$speed.speed({
    divFact: 10,
    eventListenerType: 'change',
    dangerLevel: 200,
    maxVal: 300
  });

	$power.speed({
    divFact: 10,
    maxVal: 100,
    dangerLevel: 80,
  });
});
