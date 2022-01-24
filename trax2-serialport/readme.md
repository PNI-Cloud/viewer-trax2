## npm install and npm run start

npm start --  --wsUrl=ws://localhost:8088 --apiKey=xxxxx-xxxx-xxx

Clone or copy the repository to your raspberry pi and install dependencies with `npm install`

```shell
pi@raspberrypi:~/viewer-trax2/trax2-serialport $ npm install

added 320 packages, and audited 321 packages in 22s

42 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

To execute the app, we use ts-node in the `npm run start` script

```shell
pi@raspberrypi:~/viewer-trax2/trax2-serialport $ npm run start

> trax2-serialport@1.0.0 start
> ts-node src/index.ts

{
  manufacturer: 'FTDI',
  serialNumber: 'FTBD1L2L',
  pnpId: 'usb-FTDI_TTL-232R-3V3-AJ_FTBD1L2L-if00-port0',
  locationId: undefined,
  vendorId: '0403',
  productId: '6001',
  path: '/dev/ttyUSB0'
}
{
  manufacturer: undefined,
  serialNumber: undefined,
  pnpId: undefined,
  locationId: undefined,
  vendorId: undefined,
  productId: undefined,
  path: '/dev/ttyAMA0'
}
```

## troubleshooting
check node versions (should be ok with a recent node version):
```shell
pi@raspberrypi:~/viewer-trax2/trax2-serialport $ npm --version
8.1.2
pi@raspberrypi:~/viewer-trax2/trax2-serialport $ node --version
v16.13.1
```