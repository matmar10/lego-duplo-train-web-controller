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

    const speaker = await hub.waitForDeviceByType(PoweredUP.Consts.DeviceType.DUPLO_TRAIN_BASE_SPEAKER);
    console.log('  > speaker ready');

    const led = await hub.waitForDeviceByType(PoweredUP.Consts.DeviceType.HUB_LED);
    console.log('  > led ready');
    await speaker.playTone(7);

    while(true) {
      await led.setRGB(0, 0, 0);
      await hub.sleep(1000);
      // await led.setRGB(65, 105, 225);
      await led.setRGB(255, 255, 255);
      await hub.sleep(1000);
    }
});

poweredUP.scan(); // Start scanning for Hubs
console.log("Scanning for Hubs...");
