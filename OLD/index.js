'use strict';

const PoweredUP = require('node-poweredup');
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
  maxConcurrent: 1,
  highWater: 0,
});

const poweredUP = new PoweredUP.PoweredUP();

poweredUP.on('discover', async (hub) => {
    console.log(`Discovered ${hub.name}:`, hub.ports);
    await hub.connect();
    console.log(`Connected to ${hub.name}`);

    console.log('Waiting for motor...');
    const motor = await hub.waitForDeviceAtPort('MOTOR');
    console.log(' > motor is ready.');

    console.log('Waiting for color sensor...');
    const colorSensor = await hub.waitForDeviceAtPort('COLOR');
    console.log(' > color sensor is ready.');

    // let lastSpeed = 0;
    colorSensor.on('reflect', function(ev) {
      console.log('Reflectivity:', ev.reflect);
      console.log(ev);
      // if (ev.reflect > 10 && !lastSpeed) {
      //   motor.setPower(100);
      // } else {
      //   motor.setPower(0);
      // }
    });

    const speaker = await hub.waitForDeviceByType(PoweredUP.Consts.DeviceType.DUPLO_TRAIN_BASE_SPEAKER);
    console.log('  > speaker ready');
    await speaker.playSound(PoweredUP.Consts.DuploTrainBaseSound.BRAKE);

    // let minSpeed = 50;
    // let maxSpeed = 100;
    // let increment = -5;
    // let speed = maxSpeed;
    // setInterval(async function() {
    //   // await speaker.playSound(PoweredUP.Consts.DuploTrainBaseSound.STEAM);
    //   let newSpeed = speed + increment;
    //   if (newSpeed > maxSpeed) {
    //     increment = increment * -1;
    //     newSpeed = maxSpeed + increment;
    //   } else if (newSpeed < minSpeed) {
    //     increment = increment * -1;
    //     newSpeed = minSpeed + increment;
    //   }
    //   console.log('Set speed:', newSpeed);
    //   if (increment > 0) {
    //     await speaker.playTone(9);
    //   } else {
    //     await speaker.playTone(3);
    //   }
    //   motor.setPower(newSpeed);
    //   speed = newSpeed;
    //   await hub.sleep(5000);
    // }, 2000);

    // const changeSpeed = limiter.wrap(async function(ev) {
    //   console.log('Color: ', ev.color);
    //   if (ev.color === 5 || ev.color === 3) {
    //     speaker.playSound(PoweredUP.Consts.DuploTrainBaseSound.STEAM);
    //     let newSpeed = speed + increment;
    //     console.log('New speed:', newSpeed);
    //     if (newSpeed > 100) {
    //       increment = increment * -1;
    //       newSpeed += increment;
    //     } else if (newSpeed < minSpeed) {
    //       increment = increment * 1;
    //       newSpeed += increment;
    //     }
    //     console.log('Set speed:', newSpeed);
    //     motor.setPower(newSpeed);
    //     speed = newSpeed;
    //     await hub.sleep(2000);
    //   }
    // });
    // colorSensor.on('color', async function(ev) {
    //   console.log('Color:', ev.color);
    //   // try {
    //   //   await changeSpeed(ev);
    //   // } catch (err) { }
    // });
    //
    // const speedometer = await hub.waitForDeviceByType(PoweredUP.Consts.DeviceType.DUPLO_TRAIN_BASE_SPEEDOMETER);
    // console.log('  > speedometer ready');
    // speedometer.on('speed', function(ev) {
    //   const speed = ev.speed;
    //   console.log('Speed:', speed);
    // });


    // await speaker.playSound(PoweredUP.Consts.DuploTrainBaseSound.STEAM);
    // await speaker.playSound(PoweredUP.Consts.DuploTrainBaseSound.BREAK);
    // motor.setPower(50);
    // await hub.sleep(1000);
    //
    while(true) {
      await speaker.playSound(PoweredUP.Consts.DuploTrainBaseSound.BREAK);
      motor.setPower(-50);
      await hub.sleep(750);
      await speaker.playSound(PoweredUP.Consts.DuploTrainBaseSound.BREAK);
      motor.setPower(50);
      await hub.sleep(750);
    }



    // SOUNDS:
    // 1: {1, 1}
    // 2: {3}
    // 3: {5, 3, 1}
    // 4: NONE
    // 5: {1-8va, 1}
    // 6: NONE
    // 7: {5, 5, 1-8va}
    // 8:
    // 9: {3, 5, 1-8va}
    // 10: {3, 3, 3}
    await speaker.playSound(1);

});

poweredUP.scan(); // Start scanning for Hubs
console.log("Scanning for Hubs...");
