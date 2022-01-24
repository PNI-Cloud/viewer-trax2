// import { Button, Grid, TextField } from "@mui/material";
import { NstrumentaClient } from "nstrumenta";
import React from "react";

import "./App.css";

import { Encoder, Decoder, Protocol } from "trax2core";

interface IData {
  decoded: string;
  raw: string;
  key: number,
}
interface IProps { }
interface IState {
  portName: string | null;
  serialNumber: number | null;
  magCmp: boolean,
  accelCmp: boolean,
  gyroCmp: boolean,
  otherCmps: boolean,
  customListCmp: boolean,
  data: IData[],
  consoleDecoded: boolean,
}

const magPrecision = 2;
const gyroPrecision = 4;
const accelPrecision = 4;
const hprPrecision = 2;
function getCompInfo(compId: number): [string, number] | null {
  switch (compId) {
    case 5:
      return ['heading', hprPrecision];
    case 7:
      return ['temperature', 1];
    case 8:
      return ['distortion', 0];
    case 9:
      return ['calStatus', 0];
    case 21:
      return ['accel x', accelPrecision];
    case 22:
      return ['accel y', accelPrecision];
    case 23:
      return ['accel z', accelPrecision];
    case 24:
      return ['pitch', hprPrecision];
    case 25:
      return ['roll', hprPrecision];
    case 27:
      return ['mag x', magPrecision];
    case 28:
      return ['mag y', magPrecision];
    case 29:
      return ['mag z', magPrecision];
    case 74:
      return ['gyro x', gyroPrecision];
    case 75:
      return ['gyro y', gyroPrecision];
    case 76:
      return ['gyro z', gyroPrecision];
    case 77:
      return ['quaternion', 4];
    case 79:
      return ['heading status', 0];
    default:
      return null;
  }
}

function getDateString() {
  const date = new Date();

  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ms = date.getMilliseconds();

  const hoursStr = (hours < 10) ? `0${hours}` : `${hours}`;
  const minutesStr = (minutes < 10) ? `0${minutes}` : `${minutes}`;
  const secondsStr = (seconds < 10) ? `0${seconds}` : `${seconds}`;

  const msFormatted = Number((ms / 10).toFixed(0));
  const msStr = (msFormatted < 10) ? `0${msFormatted}` : `${msFormatted}`

  return `${hoursStr}:${minutesStr}:${secondsStr}.${msStr}`;
}

function hexArray(bytes: Uint8Array) {
  const output: string[] = [];
  for (const byte of bytes) {
    const hex = byte.toString(16);
    output.push(byte < 10 ? `0${hex}` : hex);
  }
  return output;
}

// TODO: I am more familiar with Vanilla JS and manually updating the DOM, so due to time constraints, the
//       first draft of this will be a weird hybrid of React and that. The goal after a first draft is to change to use only React.
class App extends React.Component<IProps, IState> {
  private encoder = new Encoder();
  private decoder = new Decoder();
  private nstClient: NstrumentaClient | null = null;
  private newData = false;
  private customListInput = "";

  constructor(params: object) {
    super(params);

    this.state = {
      portName: null,
      serialNumber: null,
      magCmp: false,
      accelCmp: false,
      gyroCmp: false,
      otherCmps: false,
      customListCmp: false,
      data: [],
      consoleDecoded: true,
    };

    this.decoder.onGetSerialNumber = (frame) => {
      this.setState({ serialNumber: frame.serialNumber })
    }


    let count = 0;
    this.decoder.onGetData = (frame) => {
      const date = getDateString();
      let decoded = `${date}: `;

      if (frame.components.length) {
        decoded += '[';
        let first = true;
        for (const comp of frame.components) {
          if (first) {
            first = false;
          } else {
            decoded += ', ';
          }
          const compInfo = getCompInfo(comp.id)
          if (compInfo) {
            decoded += `{ ${compInfo[0]}: `;
            const values: number[] = [];
            for (const value of comp.values) {
              values.push(Number(value.toFixed(compInfo[1])));
            }
            if (values.length > 1) {
              decoded += '[';
            }
            decoded += values.join(', ');
            if (values.length > 1) {
              decoded += ']';
            }
            decoded += ' }'
          }
        }
        decoded += ']';
      } else {
        decoded += 'Unable to decode (view raw)'
      }


      const newData: IData = {
        decoded: decoded,
        raw: `${date}: [${hexArray(frame.raw).join(' ')}]`,
        key: count,
      };
      count++;

      this.newData = true;
      this.setState((prevState) => {
        return {
          data: prevState.data.concat([newData]),
        }
      });
    }
  }

  componentDidUpdate() {
    if (this.newData) {
      const table = document.getElementById('logging-table') as HTMLTableElement;
      table.scrollTop = table.scrollHeight;
    }
  }

  // https://stackoverflow.com/questions/38420396/how-to-get-value-of-textbox-in-react
  render() {
    return <div className="App">
      <div>
        <span>WebSocket URL: </span><input id={"wsUrl"} defaultValue={"ws://localhost:8088"}></input>
      </div>

      <div>
        <span>API-Key: </span><input id={"apiKey"} defaultValue={"90936cd5-de37-4003-a181-993dbd9e06ef"}></input>
      </div>

      <br />
      <button id="connectButton" onClick={evt => this.connect()}>Connect</button>
      <br />
      <br />
      <div>Current Port: {this.state.portName || 'None Detected!'}</div>

      <div style={{ display: this.state.portName ? "block" : "none" }}>
        <div>Serial number: {this.state.serialNumber}</div>
        <br />



        <div>
          <h2>Data Streaming</h2>

          <h4>Components</h4>

          <div>
            <input id={"heading"} type={"checkbox"} defaultChecked></input><label htmlFor={"heading"}>Heading</label>,
            <input id={"pitch"} type={"checkbox"} defaultChecked></input><label htmlFor={"pitch"}>Pitch</label>,
            <input id={"roll"} type={"checkbox"} defaultChecked></input><label htmlFor={"roll"}>Roll</label>
          </div>

          <div>
            <input id={"mag"} type={"checkbox"} onChange={evt => this.magChboxUpd()}></input><label htmlFor={"mag"}>Magnetometer</label>
            <span style={{ display: this.state.magCmp ? 'inline' : 'none' }}>
              &nbsp;(
              <input id={"magX"} type={"checkbox"} defaultChecked></input><label htmlFor={"magX"}>X</label>,&nbsp;
              <input id={"magY"} type={"checkbox"} defaultChecked></input><label htmlFor={"magY"}>Y</label>,&nbsp;
              <input id={"magZ"} type={"checkbox"} defaultChecked></input><label htmlFor={"magZ"}>Z</label>
              )
            </span>
          </div>

          <div>
            <input id={"accel"} type={"checkbox"} onChange={evt => this.accelChBoxUdp()}></input><label htmlFor={"accel"}>Accelerometer</label>
            <span style={{ display: this.state.accelCmp ? 'inline' : 'none' }}>
              &nbsp;(
              <input id={"accelX"} type={"checkbox"} defaultChecked></input><label htmlFor={"accelX"}>X</label>,&nbsp;
              <input id={"accelY"} type={"checkbox"} defaultChecked></input><label htmlFor={"accelY"}>Y</label>,&nbsp;
              <input id={"accelZ"} type={"checkbox"} defaultChecked></input><label htmlFor={"accelZ"}>Z</label>
              )
            </span>
          </div>

          <div>
            <input id={"gyro"} type={"checkbox"} onChange={evt => this.gyroChBocUpd()}></input><label htmlFor={"gyro"}>Gyroscope</label>
            <span style={{ display: this.state.gyroCmp ? 'inline' : 'none' }}>
              &nbsp;(
              <input id={"gyroX"} type={"checkbox"} defaultChecked></input><label htmlFor={"gyroX"}>X</label>,&nbsp;
              <input id={"gyroY"} type={"checkbox"} defaultChecked></input><label htmlFor={"gyroY"}>Y</label>,&nbsp;
              <input id={"gyroZ"} type={"checkbox"} defaultChecked></input><label htmlFor={"gyroZ"}>Z</label>
              )
            </span>
          </div>

          <div>
            <input id={"quaternion"} type={"checkbox"}></input><label htmlFor={"quaternion"}>Quaternion</label>
          </div>

          <div>
            <input id={"temperature"} type={"checkbox"}></input><label htmlFor={"temperature"}>Temperature</label>
          </div>

          <div>
            <input id={"other"} type={"checkbox"} onChange={evt => this.otherCmpsChBoxUdp()}></input><label htmlFor={"other"}>Other</label>
            <span style={{ display: this.state.otherCmps ? 'inline' : 'none' }}>
              &nbsp;(
              <input id={"distortion"} type={"checkbox"}></input><label htmlFor={"distortion"}>Distortion</label>,&nbsp;
              <input id={"calStatus"} type={"checkbox"}></input><label htmlFor={"calStatus"}>Cal Status</label>,&nbsp;
              <input id={"headingStatus"} type={"checkbox"}></input><label htmlFor={"headingStatus"}>Heading Status</label>
              )
            </span>
          </div>

          <div>
            <input id={"customList"} type={"checkbox"} onChange={evt => this.custonListChBoxUpd()}></input><label htmlFor={"customList"}>Custom List</label>
            <span style={{ display: this.state.customListCmp ? 'inline' : 'none' }}>
              &nbsp;<input placeholder={"Comma seperated list"} onChange={evt => this.customListInput = evt.target.value}></input>
            </span>
          </div>
          <div>
            <button onClick={evt => this.setComponents()}>Set Components</button>
          </div>

          <br /><br />

          <div>
            <button style={{ marginBottom: '8px' }} onClick={evt => this.getData()}>Get Data</button>
            <table id={"logging-table"} style={{ height: '100px', maxHeight: '100px', overflowY: 'scroll', display: 'block', border: '1px solid black', maxWidth: '75%' }}>
              <tbody>
                {this.state.data.map((data) => {
                  return (
                    <tr key={data.key}>
                      <td>{this.state.consoleDecoded ? data.decoded : data.raw}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <span>
              <input
                type={"radio"}
                name={"consoleDecoded"}
                id={"decoded"}
                checked={this.state.consoleDecoded}
                onChange={evt => this.consoleDecodedChange(true)}>
              </input>
              <label htmlFor={"decoded"}>Decoded</label>
            </span>
            <span style={{ marginLeft: '8px' }}>
              <input
                type={"radio"}
                name={"consoleDecoded"}
                id={"raw"}
                checked={!this.state.consoleDecoded}
                onChange={evt => this.consoleDecodedChange(false)}>
              </input>
              <label htmlFor={"raw"}>Raw</label>
            </span>
          </div>

        </div>
      </div>
    </div>
  }

  componentDidCatch(error: any, info: any) {
    console.log(error, info)

  }

  connect() {
    const wsUrlInput = document.getElementById('wsUrl') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;

    this.nstClient = new NstrumentaClient({
      wsUrl: wsUrlInput.value,
      apiKey: apiKeyInput.value,
    });

    this.nstClient.addListener("open", () => {
      console.log("nst client open");

      this.nstClient?.subscribe("list-open-ports-resp", (e: { [name: string]: { open: boolean } }) => {
        console.log(e)
        for (const key of Object.keys(e)) {
          if (e[key].open) {
            this.handleOpenPort(key);
            break;
          }
        }
      });
      this.nstClient?.send("list-open-ports", {});

      this.nstClient?.subscribe("trax2", (message) => {
        console.log('got??')
        this.decoder.decode(new Uint8Array(message.data));
      });
    });

    this.nstClient.addListener("close", () => {
      console.log('close')
    })

    this.nstClient.init();
  }

  handleOpenPort(portName: string) {
    this.setState({ portName });

    this.sendSerialMsg(this.encoder.getSerialNumber());
  }

  setComponents() {
    const list: number[] = [];

    if ((document.getElementById('heading') as HTMLInputElement).checked) {
      list.push(Protocol.ComponentId.Heading);
    }
    if ((document.getElementById('pitch') as HTMLInputElement).checked) {
      list.push(Protocol.ComponentId.Pitch);
    }
    if ((document.getElementById('roll') as HTMLInputElement).checked) {
      list.push(Protocol.ComponentId.Roll);
    }

    if (this.state.magCmp) {
      if ((document.getElementById('magX') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.MagX);
      }
      if ((document.getElementById('magY') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.MagY);
      }
      if ((document.getElementById('magZ') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.MagZ);
      }
    }

    if (this.state.accelCmp) {
      if ((document.getElementById('accelX') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.AccelX);
      }
      if ((document.getElementById('accelY') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.AccelY);
      }
      if ((document.getElementById('accelZ') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.AccelZ);
      }
    }
    
    if (this.state.gyroCmp) {
      if ((document.getElementById('gyroX') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.GyroX);
      }
      if ((document.getElementById('gyroY') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.GyroY);
      }
      if ((document.getElementById('gyroZ') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.GyroZ);
      }
    }

    if ((document.getElementById('quaternion') as HTMLInputElement).checked) {
      list.push(Protocol.ComponentId.Quaternion);
    }
    if ((document.getElementById('temperature') as HTMLInputElement).checked) {
      list.push(Protocol.ComponentId.Temperature);
    }

    if (this.state.otherCmps) {
      if ((document.getElementById('distortion') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.Distortion);
      }
      if ((document.getElementById('calStatus') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.CalStatus);
      }
      if ((document.getElementById('headingStatus') as HTMLInputElement).checked) {
        list.push(Protocol.ComponentId.HeadingStatus);
      }
    }

    // Do this last. If the user enters unknown component ids, then those id and any components after that
    // can't be decoded since components have variable lenths.
    if (this.state.customListCmp && this.customListInput) {
      const items = this.customListInput.split(',');
      for (const item of items) {
        const value = Number(item);
        if (!Number.isNaN(value) && value  >= 0 && value  < 256 && !list.includes(value)) {
          list.push(value);
        }
      }
    }

    this.sendSerialMsg(this.encoder.setDataComponents(list));
  }

  getData() {
    this.sendSerialMsg(this.encoder.getData());
  }

  sendSerialMsg(bytes: Uint8Array) {
    this.nstClient?.sendBuffer("trax-in", bytes);
  }

  magChboxUpd() {
    this.setState({ magCmp: !this.state.magCmp });
  }

  accelChBoxUdp() {
    this.setState({ accelCmp: !this.state.accelCmp });
  }

  gyroChBocUpd() {
    this.setState({ gyroCmp: !this.state.gyroCmp });
  }

  otherCmpsChBoxUdp() {
    this.setState({ otherCmps: !this.state.otherCmps });
  }

  custonListChBoxUpd() {
    this.setState({ customListCmp: !this.state.customListCmp })
  }

  consoleDecodedChange(state: boolean) {
    this.setState({ consoleDecoded: state });
  }
}

export default App;
