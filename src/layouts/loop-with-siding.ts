'use strict';

import { BehavioralFsm } from 'machina';
import {Consts as PoweredUPConsts } from 'node-poweredup';
import superagent from 'superagent';

import { buildThrottledNotifyTileDetected } from './../lib/color';
import { delay } from './../lib/delay';
import { Train } from './../train';

const throttledNotifyTileDetected = buildThrottledNotifyTileDetected();

const Consts = {

  REFLECTIVITY_MIN_ON_TRACK: 50,
  SPEED_MIN_MOVING: 20,

  WAITING_FOR_CARGO_DELAY_MS: 5000,
  COLOR_TRACK_LOOP_SIGNAL: 'BLUE',
  LAYOUT_LOOPS_BEFORE_SIDING: 3,

  CLOSE_TO_SURFACE_START_DELAY: 1500,

  MOVING_FORWARD_TIMEOUT: 10000,
  MOVING_FORWARD_STARTING_POWER: 40,
  MOVING_FORWARD_ACCELERATION_INCREMENT: 10,
  MOVING_FORWARD_ACCELERATION_DELAY: 800,
  MOVING_FORWARD_POWER: 80,

  MOVING_BACKWARD_POWER: 50,

  SIDING_BACKING_UP_MAX_TIME: 7000,
};
module.exports.Consts = Consts;

async function accelerateForward(train: Train) {
  const steps = [Consts.MOVING_FORWARD_STARTING_POWER];
  for (
    let power = Consts.MOVING_FORWARD_STARTING_POWER;
    power < Consts.MOVING_FORWARD_POWER;
    power += Consts.MOVING_FORWARD_ACCELERATION_INCREMENT) {
    const last = steps[steps.length - 1];
    steps.push(last + Consts.MOVING_FORWARD_ACCELERATION_INCREMENT);
  }
  steps.forEach(async power => {
    await train.action([{
      type: 'device',
      name: 'motor',
      method: 'setPower',
      args: [power]
    }, {
      type: 'device',
      name: 'hub',
      method: 'sleep',
      args: [Consts.MOVING_FORWARD_TIMEOUT],
    }])
    await delay(Consts.MOVING_FORWARD_ACCELERATION_DELAY);
  });
}

async function continueMovingForward(train: Train) {
  await train.action([{
    type: 'device',
    name: 'motor',
    method: 'setPower',
    args: [Consts.MOVING_FORWARD_POWER],
  }, {
    type: 'device',
    name: 'hub',
    method: 'sleep',
    args: [Consts.MOVING_FORWARD_TIMEOUT],
  }]);
}

export const layout = new BehavioralFsm({
  namespace: 'duplo-train-layout',
  initialState: 'uninitialized',
  states: {
    uninitialized: {
      _onEnter: function (train: Train) {
        train.setState('loopCount', 0);
        train.on('speedometer', 'speed', (ev: any) => layout.speed(train, ev));
        train.on('color', 'rgb', (ev: any) => layout.color(train, ev));
        train.action({
          type: 'device',
          name: 'speaker',
          method: 'playTone',
          args: [9],
        });
      },
      reflect: function (train: Train, reflectivity: number) {
        if (reflectivity < Consts.REFLECTIVITY_MIN_ON_TRACK) {
          layout.transition(train, 'awayFromSurface');
        } else {
          layout.transition(train, 'closeToSurface');
        }
      },
    },

    awayFromSurface: {
      _onEnter: function (train: Train) {
        train.action({
          type: 'device',
          name: 'speaker',
          method: 'playTone',
          args: [5],
        });
      },
      reset: 'uninitialized',
      reflect: function (train: Train, reflectivity: number) {
        if (reflectivity >= Consts.REFLECTIVITY_MIN_ON_TRACK) {
          layout.transition(train, 'closeToSurface');
        }
      },
    },

    blocked: {
      _onEnter: function (train: Train) {
        train.action([{
          type: 'device',
          name: 'motor',
          method: 'setPower',
          args: [0],
        }, {
          type: 'device',
          name: 'speaker',
          method: 'playSound',
          args: [PoweredUPConsts.DuploTrainBaseSound.BRAKE],
        }]);
      },
      reset: 'uninitialized',
      reflect: function (train: Train, reflectivity: number) {
        if (reflectivity <= Consts.REFLECTIVITY_MIN_ON_TRACK) {
          layout.transition(train, 'awayFromSurface');
        }
      },
      speed: function (train: Train, speed: number) {
        if (speed >= Consts.SPEED_MIN_MOVING) {
          layout.transition(train, 'acceleratingForward');
        } else if (speed <= -1 * Consts.SPEED_MIN_MOVING) {
          layout.transition(train, 'movingBackward');
        }
      },
    },

    stopped: {
      reset: 'uninitialized',
      speed: function (train: Train, speed: number) {
        if (speed >= Consts.SPEED_MIN_MOVING) {
          layout.transition(train, 'acceleratingForward');
        } else if (speed <= -1 * Consts.SPEED_MIN_MOVING) {
          layout.transition(train, 'movingBackward');
        }
      },
      reflect: function (train: Train, reflectivity: number) {
        if (reflectivity > Consts.REFLECTIVITY_MIN_ON_TRACK) {
          layout.transition(train, 'preparingToMove');
        } else {
          layout.transition(train, 'awayFromSurface');
        }
      },
    },

    closeToSurface: {
      _onEnter: function (train: Train) {
        train.action({
          type: 'device',
          name: 'speaker',
          method: 'playTone',
          args: [7],
        });
        train.setState('timeoutId', setTimeout(() => layout.handle(train, 'timeout'),
          Consts.CLOSE_TO_SURFACE_START_DELAY));
      },
      timeout: 'preparingToMove',
      reflect: function(train: Train, reflect: number) {
        if (reflect < Consts.REFLECTIVITY_MIN_ON_TRACK) {
          layout.transition(train, 'awayFromSurface');
        }
      },
      speed: function (train: Train, speed: number) {
        if (speed >= Consts.SPEED_MIN_MOVING) {
          layout.transition(train, 'acceleratingForward');
        }
      },
      _onExit: function (train: Train) {
        clearTimeout(train.getState('timeoutId'));
      },
    },

    preparingToMove: {
      _onEnter: async function(train: Train) {
        train.setState('actionQueue', [{
          type: 'device',
          name: 'speaker',
          method: 'playTone',
          args: [2],
        }, {
          type: 'device',
          name: 'speaker',
          method: 'playTone',
          args: [2],
        }, {
          type: 'device',
          name: 'speaker',
          method: 'playTone',
          args: [2],
        }, {
          type: 'device',
          name: 'speaker',
          method: 'playTone',
          args: [2],
        }]);
        train.setState('intervalId', setInterval(() => {
          const queue = train.getState('actionQueue');
          if (queue.length) {
            const next = queue.shift();
            train.action(next);
          } else {
            layout.handle(train, 'timeout');
          }
        }, 1000));
      },
      timeout: 'acceleratingForward',
      reflect: function(train: Train, reflect: number) {
        if (reflect < Consts.REFLECTIVITY_MIN_ON_TRACK) {
          layout.transition(train, 'awayFromSurface');
        }
      },
      speed: function (train: Train, speed: number) {
        if (speed >= Consts.SPEED_MIN_MOVING) {
          layout.transition(train, 'acceleratingForward');
        }
      },
      _onExit: function(train: Train) {
        clearInterval(train.getState('intervalId'));
        train.setState('actionQueue', null);
      }
    },

    acceleratingForward: {
      _onEnter: async function (train: Train) {
        await train.action([{
          type: 'device',
          name: 'speaker',
          method: 'playSound',
          args: [PoweredUPConsts.DuploTrainBaseSound.HORN]
        }]);
        await delay(200);
        await accelerateForward(train);
        layout.transition(train, 'movingForward');
      }
    },

    movingForward: {
      _onEnter: function (train: Train) {
        train.setState('loopCount', 0);
        // need to trigger motor power every few seconds
        train.setState('timeoutId', setTimeout(() => layout.handle(train, 'timeout'), Consts.MOVING_FORWARD_TIMEOUT));
        continueMovingForward(train);
      },
      reset: 'uninitialized',
      speed: function (train: Train, speed: number) {
        if (speed < Consts.SPEED_MIN_MOVING) {
          layout.transition(train, 'blocked');
        } else if (speed < (-1 * Consts.SPEED_MIN_MOVING)) {
          layout.transition(train, 'movingBackward');
        }
      },
      tile: function (train: Train, tileName: string) {
        if (tileName !== Consts.COLOR_TRACK_LOOP_SIGNAL) {
          return;
        }
        const newLoopCount = train.getState('loopCount') + 1;
        train.setState('loopCount', newLoopCount);
        if (newLoopCount >= Consts.LAYOUT_LOOPS_BEFORE_SIDING) {
          layout.handle(train, 'finishedLoops');
        }
      },
      timeout: async function (train: Train) {
        await continueMovingForward(train);
        // need to trigger motor power every few seconds
        train.setState('timeoutId', setTimeout(() => layout.handle(train, 'timeout'), Consts.MOVING_FORWARD_TIMEOUT));
      },
      finishedLoops: 'backingUpToSiding',
      _onExit: function (train: Train) {
        clearTimeout(train.getState('timeoutId'));
      },
    },

    movingBackward: {
      _onEnter: function (train: Train) {
        train.action([{
          type: 'device',
          name: 'motor',
          method: 'setPower',
          args: [0],
        }, {
          type: 'device',
          name: 'speaker',
          method: 'playSound',
          args: [PoweredUPConsts.DuploTrainBaseSound.BRAKE],
        }]);
        layout.transition(train, 'stopped');
      },
      reset: 'uninitialized',
    },

    backingUpToSiding: {
      _onEnter: async function (train: Train) {
        // flip track switch to send down siding track
        ////////////////////////////////////////////////////////////
        // TODO: activate servo motor
        ////////////////////////////////////////////////////////////
        train.setState('timeoutId', setTimeout(() => layout.handle(train, 'timeout'),
          Consts.SIDING_BACKING_UP_MAX_TIME));
        const res = await superagent.get('http://localhost:1604/');
        await train.action([{
          type: 'device',
          name: 'motor',
          method: 'setPower',
          args: [-1 * Consts.MOVING_BACKWARD_POWER],
        }, {
          type: 'device',
          name: 'hub',
          method: 'sleep',
          args: [10000],
        }]);
      },
      reset: 'uninitialized',
      timeout: 'waitingForCargo',
      speed: function (train: Train, speed: number) {
        if (Math.abs(speed) < Consts.SPEED_MIN_MOVING) {
          layout.transition(train, 'waitingForCargo');
        }
      },
      reflect: function (train: Train, reflectivity: number) {
        if (reflectivity < Consts.REFLECTIVITY_MIN_ON_TRACK) {
          layout.transition(train, 'awayFromSurface');
        }
      },
    },
    waitingForCargo: {
      _onEnter: function (train: Train) {
        train.action([{
          type: 'device',
          name: 'motor',
          method: 'setPower',
          args: [0],
        }, {
          type: 'device',
          name: 'hub',
          method: 'sleep',
          args: [0]
        }]);
        const timeoutId = setTimeout(() => layout.handle(train, 'finished'),
          Consts.WAITING_FOR_CARGO_DELAY_MS);
        train.setState('timeoutId', timeoutId);
      },
      reset: 'uninitialized',
      finished: 'preparingToMove',
      reflect: function (train: Train, reflectivity: number) {
        if (reflectivity < Consts.REFLECTIVITY_MIN_ON_TRACK) {
          layout.deferUntilTransition(train);
          layout.transition(train, 'awayFromSurface');
        }
      },
      _onExit: function (train: Train) {
        clearTimeout(train.getState('timeoutId'));
      },
    },
  },

  start: function (train: Train) {
    this.handle(train, 'reset');
  },

  speed: function (train: Train, ev: any) {
    this.handle(train, 'speed', ev.speed);
  },

  color: function (train: Train, ev: any) {
    this.handle(train, 'reflect', ev.red + ev.green + ev.blue);
    throttledNotifyTileDetected(ev, (tileName: string) => layout.tile(train, tileName));
  },

  tile: function (train: Train, tileName: string) {
    this.handle(train, 'tile', tileName);
  }
});
