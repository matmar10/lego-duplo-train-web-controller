'use strict';

const machina = require('machina');

const Consts = {
  REFLECTIVITY_MIN_ON_TRACK: 10,
  SPEED_MIN_MOVING: 50,
  SPEED_MOVING: 60,
  WAITING_FOR_CARGO_DELAY_MS: 5000,
  COLOR_TRACK_LOOP_SIGNAL: 'blue',
  LAYOUT_LOOPS_BEFORE_SIDING: 3,
  CLOSE_TO_SURFACE_START_DELAY: 30000
};
module.exports.Consts = Consts;

const layout = new machina.BehavioralFsm({
  namespace: 'duplo-train-layout',
  initialState: 'uninitialized',
  states: {
    uninitialized: {
      '*': function(train) {
        train.action({
          type: 'device',
          name: 'speaker',
          method: 'playTone',
          args: [9]
        });
        this.deferUntilTransition(train);
        this.transition(train, 'awayFromSurface');
      }
    },

    awayFromSurface: {
      _onEnter: function(train) {
        train.action({
          type: 'device',
          name: 'speaker',
          method: 'playTone',
          args: [5]
        });
      },
      reset: 'uninitialized',
      reflect: function(train, reflectivity) {
        if (reflectivity >= Consts.REFLECTIVITY_MIN_ON_TRACK) {
          this.transition(train, 'closeToSurface');
        }
      }
    },

    blocked: {
      _onEnter: function(train) {
        train.action([{
          type: 'device',
          name: 'motor',
          method: 'setPower',
          args: [0]
        }, {
          type: 'device',
          name: 'speaker',
          method: 'playSound',
          args: ['BRAKE']
        }]);
      },
      reset: 'uninitialized',
      reflect: function(train, reflectivity) {
        if (reflectivity <= Consts.REFLECTIVITY_MIN_ON_TRACK) {
          this.transition(train, 'awayFromSurface');
        }
      },
      speed: function(train, speed) {
        if (speed >= Consts.SPEED_MIN_MOVING) {
          this.transition(train, 'movingForward');
        } else if (speed <= -1 * Consts.SPEED_MIN_MOVING) {
          this.transition(train, 'movingBackward');
        }
      }
    },

    stopped: {
      reset: 'uninitialized',
      speed: function(train, speed) {
        if (speed >= Consts.SPEED_MIN_MOVING) {
          this.transition(train, 'movingForward');
        } else if (speed <= -1 * Consts.SPEED_MIN_MOVING) {
          this.transition(train, 'movingBackward');
        }
      },
      reflect: function(train, reflectivity) {
        if (reflectivity > Consts.REFLECTIVITY_MIN_ON_TRACK) {
          this.transition(train, 'movingForward');
        } else {
          this.transition(train, 'awayFromSurface');
        }
      }
    },

    closeToSurface: {
      _onEnter: function(train) {
        train.action({
          type: 'device',
          name: 'speaker',
          method: 'playTone',
          args: [7]
        })
        const timerId = setTimeout(() => {
          this.handle(train, 'timeout');
        }, Consts.CLOSE_TO_SURFACE_START_DELAY);
        train.setState('timerId', timerId);
      },
      timeout: function(train) {
        this.transition(train, 'movingForward');
      },
      speed: function(train, speed) {
        if (speed >= Consts.SPEED_MIN_MOVING) {
          this.transition(train, 'movingForward');
        }
      },
      _onExit: function(train) {
        const timerId = train.getState('timerId');
        clearTimeout(timerId);
      },
    },

    movingForward: {
      _onEnter: function(train) {
        train.setState('loopCount', 0);
        train.action([{
          type: 'device',
          name: 'motor',
          method: 'setPower',
          args: [60]
        }, {
          type: 'device',
          name: 'hub',
          method: 'sleep',
          args: [10000]
        }]);
      },
      reset: 'uninitialized',
      reflect: function(train, reflectivity) {
        if (reflectivity < Consts.REFLECTIVITY_MIN_ON_TRACK) {
          this.transition(train, 'awayFromSurface');
        }
      },
      speed: function(train, speed) {
        if (speed < Consts.SPEED_MIN_MOVING) {
          this.transition(train, 'blocked');
        } else if (speed < -1 * Consts.SPEED_MIN_MOVING) {
          this.transition(train, 'movingBackward');
        }
      },
      color: function(train, color) {
        let loopCount = train.getState('loopCount');
        if (color === Consts.COLOR_TRACK_LOOP_SIGNAL) {
          loopCount++;
        }
        train.setState('loopCount', loopCount);
        if (loopCount >= Consts.LAYOUT_LOOPS_BEFORE_SIDING) {
          this.handle(train, 'finishedLoops');
        }
      },
      finishedLoops: 'backingUpToSiding'
    },

    movingBackward: {
      _onEnter: function(train) {
        train.action([{
          type: 'device',
          name: 'motor',
          method: 'setPower',
          args: [0]
        }, {
          type: 'device',
          name: 'speaker',
          method: 'playSound',
          args: ['BRAKE']
        }]);
        this.transition(train, 'stopped');
      },
      reset: 'uninitialized',
    },

    backingUpToSiding: {
      _onEnter: function(train) {
        // flip track switch to send down siding track
        // TODO: activate servo motor
        train.action([{
          type: 'device',
          name: 'motor',
          method: 'setPower',
          args: [-70]
        }, {
          type: 'device',
          name: 'hub',
          method: 'sleep',
          args: [10000]
        }]);
      },
      reset: 'uninitialized',
      speed: function(train, speed) {
        if (Math.abs(speed) < Consts.SPEED_MIN_MOVING) {
          this.transition(train, 'waitingForCargo');
        }
      },
      reflect: function(train, reflectivity) {
        if (reflectivity < Consts.REFLECTIVITY_MIN_ON_TRACK) {
          this.transition(train, 'awayFromSurface');
        }
      },
    },
    waitingForCargo: {
      _onEnter: function(train) {
        const timerId = setTimeout(() => {
          this.handle(train, 'timeout');
        }, Consts.WAITING_FOR_CARGO_DELAY_MS);
        train.setState('timerId', timerId);
        train.action([{
          type: 'device',
          name: 'motor',
          method: 'setPower',
          args: [0]
        }]);
      },
      reset: 'uninitialized',
      timeout: 'movingForward',
      reflect: function(train, reflectivity) {
        if (reflectivity < Consts.REFLECTIVITY_MIN_ON_TRACK) {
          this.deferUntilTransition(train);
          this.transition(train, 'awayFromSurface');
        }
      },
      speed: function(train, speed) {},
      _onExit: function(train) {
        const timerId = train.getState('timerId');
        clearTimeout(timerId);
      }
    },
  },

  start: function(train) {
    this.handle(train, 'reset');
  },

  speed: function(train, speed) {
    this.handle(train, 'speed', speed);
  },

  reflect: function(train, reflectivity) {
    this.handle(train, 'reflect', reflectivity);
  },

  color: function(train, color) {
    this.handle(train, 'color', color);
  }
});
module.exports.layout = layout;
