'use strict';

const machina = require('machina');
const EventEmitter = require('events');

async function wait(delay) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

class Motor {
  setPower(power) {
    console.log(`MOTOR - set power: ${power}`);
  }
}

class Speaker {
  playSound(sound) {
    console.log(`SPEAKER - play sound: ${sound}`);
  }
}

class Train extends EventEmitter {
  constructor(name) {
    super();
    this.name = name;
    this.motor = new Motor();
    this.speaker = new Speaker();
  }
}

const train = new Train('#1');

const REFLECTIVITY_MIN_ON_TRACK = 50;
const SPEED_MIN_MOVING = 30;
const WAITING_FOR_CARGO_DELAY_MS = 5000;
const COLOR_TRACK_LOOP_SIGNAL = 'blue';
const LAYOUT_LOOPS_BEFORE_SIDING = 3;

const layout = new machina.BehavioralFsm({
  namespace: 'duplo-train-layout',
  initialState: 'uninitialized',
  states: {
    uninitialized: {
      '*': function(client) {
        this.deferUntilTransition(client);
        this.transition(client, 'awayFromSurface');
      }
    },

    awayFromSurface: {
      _onEnter: function(train) {
        train.motor.setPower(0);
      },
      reflect: function(train, reflectivity) {
        if (reflectivity >= REFLECTIVITY_MIN_ON_TRACK) {
          this.transition(train, 'closeToSurface');
        }
      }
    },

    blocked: {
      _onEnter: function(train) {
        train.motor.setPower(0);
        train.speaker.playSound('BRAKE');
      },
      reflect: function(train, reflectivity) {
        if (reflectivity <= REFLECTIVITY_MIN_ON_TRACK) {
          this.transition(train, 'awayFromSurface');
        }
      },
      speed: function(train, speed) {
        if (speed >= SPEED_MIN_MOVING) {
          this.transition(train, 'movingForward');
        } else if (speed <= -1 * SPEED_MIN_MOVING) {
          this.transition(train, 'movingBackward');
        }
      }
    },

    stopped: {
      speed: function(train, speed) {
        if (speed >= SPEED_MIN_MOVING) {
          this.transition(train, 'movingForward');
        } else if (speed <= -1 * SPEED_MIN_MOVING) {
          this.transition(train, 'movingBackward');
        }
      },
      reflect: function(train, reflectivity) {
        if (reflectivity > REFLECTIVITY_MIN_ON_TRACK) {
          this.transition(train, 'movingForward');
        } else {
          this.transition(train, 'awayFromSurface');
        }
      }
    },

    closeToSurface: {
      '*': function(train) {
        this.deferUntilTransition(train);
        this.transition(train, 'movingForward');
      }
    },

    movingForward: {
      _onEnter: function(train) {
        train.loopCount = 0;
        train.motor.setPower(60);
      },
      reflect: function(train, reflectivity) {
        if (reflectivity < REFLECTIVITY_MIN_ON_TRACK) {
          this.transition(train, 'awayFromSurface');
        }
      },
      speed: function(train, speed) {
        if (speed < SPEED_MIN_MOVING) {
          this.transition(train, 'blocked');
        } else if (speed < -1 * SPEED_MIN_MOVING) {
          this.transition(train, 'movingBackward');
        }
      },
      color: function(train, color) {
        if (color === COLOR_TRACK_LOOP_SIGNAL) {
          train.loopCount++;
        }
        if (train.loopCount >= LAYOUT_LOOPS_BEFORE_SIDING) {
          this.handle(train, 'finishedLoops');
        }
      },
      finishedLoops: 'backingUpToSiding'
    },

    movingBackward: {
      _onEnter: function(train) {
        train.motor.setPower(0);
        train.speaker.playSound('BRAKE');
        this.transition(train, 'stopped');
      }
    },

    backingUpToSiding: {
      _onEnter: function(train) {
        // flip track switch to send down siding track
        // TODO: activate servo motor
        // reverse train
        train.motor.setPower(-70);
      },
      speed: function(train, speed) {
        if (Math.abs(speed) < SPEED_MIN_MOVING) {
          this.transition(train, 'waitingForCargo');
        }
      },
      reflect: function(train, reflectivity) {
        if (reflectivity < REFLECTIVITY_MIN_ON_TRACK) {
          this.transition(train, 'awayFromSurface');
        }
      },
    },
    waitingForCargo: {
      _onEnter: function(train) {
        train.timer = setTimeout(() => {
          this.handle(train, 'timeout');
        }, WAITING_FOR_CARGO_DELAY_MS);
        train.motor.setPower(0);
      },
      timeout: 'movingForward',
      reflect: function(train, reflectivity) {
        if (reflectivity < REFLECTIVITY_MIN_ON_TRACK) {
          this.deferUntilTransition(train);
          this.transition(train, 'awayFromSurface');
        }
      },
      speed: function(train, speed) {},
      _onExit: function(train) {
        clearTimeout(train.timer);
      }
    },
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

layout.on('*', function (eventName, data) {
  console.log(`  >>> Event Name: ${eventName}:`);
  console.log(`  >>> Prior State: ${data.client.__machina__['duplo-train-layout'].priorState}`);
  console.log(`  >>> State: ${data.client.__machina__['duplo-train-layout'].state}`);
});

const actions = [{
  m: 'Train starts away from track',
  f: () => layout.reflect(train, 10)
}, {
  m: 'Train set on track',
  f: () => layout.reflect(train, 100),
}, {
  m: 'Train stationary on track',
  f: () => layout.speed(train, 10),
}, {
  m: 'Train moving forward',
  f: () => layout.speed(train, 200),
}, {
  m: 'Train moving forward (still...)',
  f: () => layout.speed(train, 120),
}, {
  m: 'Passes signal tile 1st time',
  f: () => layout.color(train, 'blue'),
}, {
  m: 'Train moving forward (still.........)',
  f: () => layout.speed(train, 230),
}, {
  m: 'Passes signal tile 2nd time',
  f: () => layout.color(train, 'blue'),
}, {
  m: 'Train moving forward (still......)',
  f: () => layout.speed(train, 150),
}, {
  m: 'Passes signal tile 3rd time',
  f: () => layout.color(train, 'blue'),
}, {
  m: 'Train moving backward',
  f: () => layout.speed(train, -200)
}, {
  m: 'Train (still) moving backward',
  f: () => layout.speed(train, -200)
}, {
  m: 'Train hits end of track',
  f: () => layout.speed(train, -20)
}, {
  m: 'Train sitting idle',
  f: async () => wait(6000)
}, {
  m: 'Train picked up',
  f: () => layout.reflect(train, 0)
},
{ f: async () => wait(1000) },
{ m: 'Train put down',
  f: () => layout.reflect(train, 200) },
{ m: 'Train picked up',
  f: () => layout.reflect(train, 10) },
{ m: 'Train put down',
  f: () => layout.reflect(train, 200) },
{ m: 'Train blocked',
  f: () => layout.speed(train, 5) },
{ m: 'Train blocked',
  f: () => layout.speed(train, 5) },
{ m: 'Train picked up',
  f: () => layout.reflect(train, 200) },
{ m: 'Train put down',
  f: () => layout.reflect(train, 200) },
{ m: 'Train moving forward',
  f: () => layout.speed(train, 200) },
{ m: 'Train moving forward',
  f: () => layout.speed(train, 200) },
{ f: async () => wait(1000) },
{ m: 'Train moving forward',
f: () => layout.speed(train, 200) },
{ m: 'Passes blue signal tile',
  f: () => layout.color(train, 'blue'), },
{ m: 'Train moving forward',
  f: () => layout.speed(train, 200) },
{ m: 'Passes blue signal tile',
  f: () => layout.color(train, 'blue'), },
{ m: 'Train moving forward',
  f: () => layout.speed(train, 200) },
{ m: 'Passes blue signal tile',
  f: () => layout.color(train, 'blue'), },
{ m: 'Train moving forward',
  f: () => layout.speed(train, 200) },
{ m: 'Train hits end of track',
  f: () => layout.speed(train, -20) },
{ m: 'Train hits end of track',
  f: () => layout.speed(train, -20) },
{ m: 'Train hits end of track',
  f: () => layout.speed(train, -20) },
{ m: 'Train hits end of track',
  f: () => layout.speed(train, -20) },
{ m: 'Train moving forward',
  f: () => layout.speed(train, 200) },
{ m: 'Train hits end of track',
  f: () => layout.speed(train, -20) },
{ m: 'Train moving forward',
  f: () => layout.speed(train, 200) },
{ m: 'Train moving forward',
  f: () => layout.speed(train, 200) },
];

async function run() {

  for(let i = 0; i < actions.length; i++) {
    const action = actions[i];
    if (action.m) {
      console.log(`============== ACTION #${i} ==============`);
      console.log(`---- ${action.m} ----`);
      await action.f();
    }
  }
}

run();
