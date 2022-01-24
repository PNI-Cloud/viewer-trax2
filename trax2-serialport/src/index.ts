import SerialPort from "serialport";
import minimist from "minimist";
import { NstrumentaClient } from "nstrumenta";
import fs from "fs";
import ws from "ws";

const argv = minimist(process.argv.slice(2));
const wsUrl = argv.wsUrl || 'ws://localhost:8088';
const apiKey = argv.apiKey;
console.log(wsUrl, apiKey)

const debug = argv.debug ? argv.debug : false;

let serialPort: SerialPort | undefined = undefined;

const nst = wsUrl ? new NstrumentaClient({ apiKey, wsUrl }) : null;
if (nst) {
  console.log("nst wsUrl:", wsUrl)
}

const openPorts: { [name: string]: { open: boolean } } = { };
nst?.addListener("open", () => {
  console.log("nstrumenta open");

  nst?.subscribe("list-open-ports", () => {
    nst?.send("list-open-ports-resp", openPorts);
  });

  scan();
});
//start scan if nst not set
if (!nst) {
  scan();
}
try {
  nst?.init(ws as any);
} catch (ex) {
  console.log('failed...', ex)
}


var serialDevices = [
  {
    name: "trax2",
    vendorId: "0403",
    productId: "6001",
    baudRate: 38600,
  },
];

if (fs.existsSync("nst-serialport-config.json")) {
  console.log("nst-serialport-config.json begin:");
  var config = JSON.parse(
    fs.readFileSync("nst-serialport-config.json", "utf8")
  );
  config.devices.forEach((element: any) => {
    console.dir(element);
    serialDevices.push(element);
  });
  console.log("nst-serialport-config.json end");
}


function match(devicePort: SerialPort.PortInfo, device: { name?: string; vendorId: any; productId: any; baudRate?: number; path?: any; }) {
  var match: boolean | "" | undefined = false;
  //match on path from config file
  if (device.path) {
    match = device.path == devicePort.path;
  }
  //match on vId and pId
  match =
    devicePort.vendorId &&
    devicePort.vendorId.toLowerCase() == device.vendorId &&
    devicePort.productId &&
    devicePort.productId.toLowerCase() == device.productId;
  return match;
}

function scan() {
  SerialPort.list().then((devicePorts) => {
    devicePorts.forEach(function (devicePort) {
      console.dir(devicePort);
      //look for device in list
      serialDevices.forEach((device) => {
        const serialDevice = device;
        if (match(devicePort, device)) {
          console.log("connecting to", devicePort.path, serialDevice.name);
          serialPort = new SerialPort(devicePort.path, {
            baudRate: device.baudRate,
          });

          serialPort.on("open", function () {
            openPorts[devicePort.path] = { open: true };
            nst?.send("serialport-events", { "type": "open", serialDevice });
            nst?.subscribe("trax-in", (message: number[]) => {
              const bytes = new Uint8Array(message);
              console.log("trax-in", bytes)
              serialPort?.write(Array.from(bytes));
            });
          });
          serialPort.on("error", function (err) {
            console.error(err);
            nst?.send("serialport-events", { "type": "error", serialDevice, value: err });
          });
          serialPort.on("close", () => {
            nst?.send("serialport-events", { "type": "close", serialDevice });
            openPorts[devicePort.path] = { open: false };
          });

          serialPort.on("data", function (data) {
            switch (serialDevice.name) {
              default:
                console.log('sending', serialDevice.name, data)
                nst?.send(serialDevice.name, data);
                break;
            }
          });
        }
      });
    });
  });
}
