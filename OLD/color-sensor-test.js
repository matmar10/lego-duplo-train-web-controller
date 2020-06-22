'use strict';

const PoweredUP = require('node-poweredup');
const Bottleneck = require('bottleneck');

const limiter = new Bottleneck({
  maxConcurrent: 1,
  highWater: 0,
  minTime: 1000
});

const poweredUP = new PoweredUP.PoweredUP();

poweredUP.on('discover', async (hub) => {
    console.log(`Discovered ${hub.name}:`, hub.ports);
    await hub.connect();
    console.log(`Connected to ${hub.name}`);

    const speaker = await hub.waitForDeviceByType(PoweredUP.Consts.DeviceType.DUPLO_TRAIN_BASE_SPEAKER);
    console.log('  > speaker ready');
    console.log('Waiting for color sensor...');
    const colorSensor = await hub.waitForDeviceAtPort('COLOR');
    console.log(' > color sensor is ready.');

    const led = await hub.waitForDeviceByType(PoweredUP.Consts.DeviceType.HUB_LED);
    console.log('  > led ready');
    await speaker.playTone(7);

    const setColor = limiter.wrap(async function(ev) {
      console.log('Setting:', ev);
      await led.setRGB(ev.red, ev.green, ev.blue);
    });
    colorSensor.on('rgb', async function(ev) {
      try {
        await setColor(ev);
      } catch (err) { }
    });
    //
    // while(true) {
    //   await led.setRGB(0, 0, 0);
    //   await hub.sleep(1000);
    //   // await led.setRGB(65, 105, 225);
    //   await led.setRGB(255, 255, 255);
    //   await hub.sleep(1000);
    // }
});

poweredUP.scan(); // Start scanning for Hubs
console.log("Scanning for Hubs...");
