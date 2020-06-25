'use strict';

const usb = require('usb');

try {

  const devices = usb.getDeviceList();
  console.log(devices);
  const [ device ] = devices.filter((device) => {
    return -1 !== device.portNumbers.find(1);
  });

  const [iface] = device.interfaces;
  iface.claim();
  const endpoints = iface.endpoints;
  console.log(endpoints);

} catch (err) {
  console.error(err);
  process.exit(1);
}
