// import { Button, Grid, TextField } from "@mui/material";
import { NstrumentaClient } from 'nstrumenta';
import React from 'react';
import ReactModal from 'react-modal';
import { saveAs } from 'file-saver';

import {
  Encoder,
  Decoder,
  Protocol,
  Frames,
} from 'trax2core';

import { CollapseSection } from './components/CollapseSection';

import './App.css';

interface IData {
  decoded: string;
  raw: string;
  ts: string;
  key: number;
}
interface DataFrame {
  ts: number;
  frame: Frames.Data;
}

interface IProps { }
interface IState {
  portName: string | null;
  serialNumber: number | null;
  magCmp: boolean;
  accelCmp: boolean;
  gyroCmp: boolean;
  otherCmps: boolean;
  customListCmp: boolean;
  data: IData[];
  consoleDecoded: boolean,
  isPollMode: boolean;
  pendingIsPollMode: boolean | null;
  flushFilters: boolean;
  sampleDelay: number;
  ctsModeStarted: boolean;
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
      return ['accelX', accelPrecision];
    case 22:
      return ['accelY', accelPrecision];
    case 23:
      return ['accelZ', accelPrecision];
    case 24:
      return ['pitch', hprPrecision];
    case 25:
      return ['roll', hprPrecision];
    case 27:
      return ['magX', magPrecision];
    case 28:
      return ['magY', magPrecision];
    case 29:
      return ['magZ', magPrecision];
    case 74:
      return ['gyroX', gyroPrecision];
    case 75:
      return ['gyroY', gyroPrecision];
    case 76:
      return ['gyroZ', gyroPrecision];
    case 77:
      return ['quaternion', 4];
    case 79:
      return ['headingStatus', 0];
    default:
      return null;
  }
}

function getDateString(date: Date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ms = date.getMilliseconds();

  const hoursStr = (hours < 10) ? `0${hours}` : `${hours}`;
  const minutesStr = (minutes < 10) ? `0${minutes}` : `${minutes}`;
  const secondsStr = (seconds < 10) ? `0${seconds}` : `${seconds}`;

  const msFormatted = Number(Math.floor(ms / 10));
  const msStr = (msFormatted < 10) ? `0${msFormatted}` : `${msFormatted}`;

  return `${hoursStr}:${minutesStr}:${secondsStr}.${msStr}`;
}

function getFilenameDateString() {
  const date = new Date();

  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDay();
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const seconds = date.getUTCSeconds();

  const monthStr = (month < 10) ? `0${month}` : `${month}`;
  const dayStr = (day < 10) ? `0${day}` : `${day}`;
  const hoursStr = (hours < 10) ? `0${hours}` : `${hours}`;
  const minutesStr = (minutes < 10) ? `0${minutes}` : `${minutes}`;
  const secondsStr = (seconds < 10) ? `0${seconds}` : `${seconds}`;

  return `${year}-${monthStr}-${dayStr}_${hoursStr}_${minutesStr}_${secondsStr}`;
}

function hexArray(bytes: Uint8Array) {
  const output: string[] = [];

  bytes.forEach((byte) => {
    const hex = byte.toString(16);
    output.push(byte < 10 ? `0${hex}` : hex);
  });
  return output;
}

// TODO: I am more familiar with Vanilla JS and manually updating the DOM, so due to time
//        constraints, the first draft of this will be a weird hybrid of React and that.
//        The goal after a first draft is to change to use only React.
class App extends React.Component<IProps, IState> {
  private encoder = new Encoder();

  private decoder = new Decoder();

  private nstClient: NstrumentaClient | null = null;

  private newData = false;

  private dataWillUpdate = false;

  private customListInput = '';

  private makeStartupRequests = true;

  private lastDataUpdate = new Date().getTime();

  private initiallyCtsMode = false;

  private receivedDataFrames: DataFrame[] = [];

  private tableKey = 0;

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
      isPollMode: true,
      pendingIsPollMode: null,
      flushFilters: false,
      sampleDelay: 0,
      ctsModeStarted: false,
    };

    this.decoder.onGetSerialNumber = (frame) => {
      this.setState({ serialNumber: frame.serialNumber });
      if (this.makeStartupRequests) {
        this.sendSerialMsg(this.encoder.getAcquisitionParams());
      }
    };

    this.decoder.onGetAcquisitionParams = (frame) => {
      this.makeStartupRequests = false;
      if (!this.initiallyCtsMode) {
        this.initiallyCtsMode = true;
      }
      this.setState({
        isPollMode: frame.isPollMode,
        flushFilters: frame.flushFilters,
        sampleDelay: Number(frame.sampleDelay.toFixed(5)),
        pendingIsPollMode: null,
      });
    };

    this.decoder.onSetAcquisitionParams = () => {
      const { pendingIsPollMode } = this.state;
      if (typeof pendingIsPollMode === 'boolean') {
        this.setState({ isPollMode: pendingIsPollMode, pendingIsPollMode: null });
      }
    };

    this.decoder.onGetData = (frame) => {
      const { ctsModeStarted, isPollMode } = this.state;
      if (!isPollMode && !ctsModeStarted && !this.initiallyCtsMode) {
        this.initiallyCtsMode = true;
        this.setState({ ctsModeStarted: true });
      }

      const date = new Date();
      const ts = getDateString(date);
      this.receivedDataFrames.push({ ts: date.getTime(), frame });

      let decoded = '';
      if (frame.components.length) {
        decoded += '[';
        let first = true;
        frame.components.forEach((comp) => {
          if (first) {
            first = false;
          } else {
            decoded += ', ';
          }
          const compInfo = getCompInfo(comp.id);
          if (compInfo) {
            decoded += `{ ${compInfo[0]}: `;
            const values: number[] = [];
            comp.values.forEach((value) => {
              values.push(Number(value.toFixed(compInfo[1])));
            });
            if (values.length > 1) {
              decoded += '[';
            }
            decoded += values.join(', ');
            if (values.length > 1) {
              decoded += ']';
            }
            decoded += ' }';
          }
        });
        decoded += ']';
      } else {
        decoded += 'Unable to decode (view raw)';
      }

      const newData = {
        decoded,
        raw: `[${hexArray(frame.raw).join(' ')}]`,
        ts,
        key: 0,
      };

      if (!this.newData) {
        const diff = new Date().getTime() - this.lastDataUpdate;
        if (diff >= 10) {
          this.newData = true;
          this.setState((prevState) => {
            // console.log(newData);
            const data: IData[] = [];
            const start = (prevState.data.length < 500)
              ? 0
              : prevState.data.length - 500 - 1;
            for (let i = start; i < prevState.data.length; i += 1) {
              data.push(prevState.data[i]);
            }
            newData.key = this.tableKey;
            this.tableKey += 1;
            data.push(newData);
            this.dataWillUpdate = true;
            return { data };
          });
        }
      }
    };
  }

  componentDidMount() {
    ReactModal.setAppElement('#root');
  }

  componentDidUpdate() {
    if (this.newData && this.dataWillUpdate) {
      this.lastDataUpdate = new Date().getTime();
      this.newData = false;
      this.dataWillUpdate = false;
      const table = document.getElementById('logging-table') as HTMLTableElement;
      table.scrollTop = table.scrollHeight;
    }
  }

  componentDidCatch(error: any, info: any) {
    console.log(error, info);
  }

  connect() {
    const wsUrlInput = document.getElementById('wsUrl') as HTMLInputElement;
    const apiKeyInput = document.getElementById('apiKey') as HTMLInputElement;

    this.nstClient = new NstrumentaClient({
      wsUrl: wsUrlInput.value,
      apiKey: apiKeyInput.value,
    });

    this.nstClient.addListener('open', () => {
      console.log('nst client open');

      this.nstClient?.subscribe('list-open-ports-resp', (response: { [name: string]: { open: boolean } }) => {
        console.log(response);
        const keys = Object.keys(response);
        for (let i = 0; i < keys.length; i += 1) {
          const key = keys[i];
          if (response[key].open) {
            this.openPortUpdates(key);
            break;
          }
        }
      });
      this.nstClient?.send('list-open-ports', {});

      this.nstClient?.subscribe('trax2', (message) => {
        const bytes = new Uint8Array(message.data);
        // console.log('Received bytes: ', bytes);
        this.decoder.decode(bytes);
      });
    });

    this.nstClient.addListener('close', () => {
      console.log('close');
    });

    this.nstClient.init();
  }

  sendSerialMsg(bytes: Uint8Array) {
    this.nstClient?.sendBuffer('trax-in', bytes);
  }

  openPortUpdates(portName: string) {
    this.setState({ portName });
    if (this.makeStartupRequests) {
      this.sendSerialMsg(this.encoder.getSerialNumber());
    }
  }

  updateComponents() {
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

    const {
      magCmp,
      accelCmp,
      gyroCmp,
      otherCmps,
      customListCmp,
    } = this.state;

    if (magCmp) {
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

    if (accelCmp) {
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

    if (gyroCmp) {
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

    if (otherCmps) {
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

    // Do this last. If the user enters unknown component ids, then those id and any components
    // after that can't be decoded since components have variable lenths.
    if (customListCmp && this.customListInput) {
      const items = this.customListInput.split(',');
      items.forEach((item) => {
        const value = Number(item);
        if (!Number.isNaN(value) && value >= 0 && value < 256 && !list.includes(value)) {
          list.push(value);
        }
      });
    }

    this.sendSerialMsg(this.encoder.setDataComponents(list));
  }

  requestData() {
    const { isPollMode } = this.state;
    if (isPollMode) {
      this.sendSerialMsg(this.encoder.getData());
    } else {
      const { ctsModeStarted } = this.state;
      if (ctsModeStarted) {
        this.sendSerialMsg(this.encoder.stopContinuousMode());
      } else {
        this.sendSerialMsg(this.encoder.startContinuousMode());
      }
      this.setState({ ctsModeStarted: !ctsModeStarted });
    }
  }

  isPollModeUpdate(state: boolean) {
    this.setState({ pendingIsPollMode: state });
  }

  updateAcqParams() {
    const {
      pendingIsPollMode,
      flushFilters,
      sampleDelay,
    } = this.state;

    let newIsPollMode = true;
    if (typeof pendingIsPollMode === 'boolean') {
      newIsPollMode = pendingIsPollMode;
    } else {
      const { isPollMode } = this.state;
      newIsPollMode = isPollMode;
    }
    const bytes = this.encoder.setAcquisitionParams(newIsPollMode, flushFilters, sampleDelay);
    this.sendSerialMsg(bytes);
  }

  magChboxUpd() {
    const { magCmp } = this.state;
    this.setState({ magCmp: !magCmp });
  }

  accelChBoxUdp() {
    const { accelCmp } = this.state;
    this.setState({ accelCmp: !accelCmp });
  }

  gyroChBocUpd() {
    const { gyroCmp } = this.state;
    this.setState({ gyroCmp: !gyroCmp });
  }

  otherCmpsChBoxUdp() {
    const { otherCmps } = this.state;
    this.setState({ otherCmps: !otherCmps });
  }

  custonListChBoxUpd() {
    const { customListCmp } = this.state;
    this.setState({ customListCmp: !customListCmp });
  }

  consoleDecodedChange(state: boolean) {
    this.setState({ consoleDecoded: state });
  }

  clearData() {
    this.receivedDataFrames = [];
    this.tableKey = 0;
    this.setState({ data: [] });
  }

  exportData() {
    const { consoleDecoded, serialNumber } = this.state;

    const json: object[] = [];
    this.receivedDataFrames.forEach((item) => {
      if (consoleDecoded) {
        const components: object[] = [];
        item.frame.components.forEach((comp) => {
          const compInfo = getCompInfo(comp.id);
          if (compInfo) {
            components.push({
              [compInfo[0]]: comp.values,
            });
          }
        });

        json.push({
          ts: item.ts,
          components,
        });
      } else {
        json.push({
          ts: item.ts,
          bytes: Array.from(item.frame.raw),
        });
      }
    });

    const filename = `${serialNumber}_${getFilenameDateString()}.json`;
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
    saveAs(blob, filename);
  }

  render() {
    // https://stackoverflow.com/questions/38420396/how-to-get-value-of-textbox-in-react
    const {
      data,
      portName,
      serialNumber,
      magCmp,
      accelCmp,
      gyroCmp,
      customListCmp,
      consoleDecoded,
      otherCmps,
      isPollMode,
      pendingIsPollMode,
      flushFilters,
      sampleDelay,
      ctsModeStarted,
    } = this.state;

    const dataModeStr = (isPollMode) ? 'Poll Data' : (ctsModeStarted) ? 'Stop Continuous Output' : 'Start Continuous Output';
    let isPollModeValueToShow = false;
    if (typeof pendingIsPollMode === 'boolean') {
      isPollModeValueToShow = pendingIsPollMode;
    } else {
      isPollModeValueToShow = isPollMode;
    }

    return (
      <div className="App" style={{ padding: '4px' }}>
        <div>
          <span>WebSocket URL: </span>
          <input id="wsUrl" defaultValue="ws://localhost:8088" />
        </div>

        <div>
          <span>API-Key: </span>
          <input id="apiKey" defaultValue="90936cd5-de37-4003-a181-993dbd9e06ef" />
        </div>

        <br />
        <button type="button" id="connectButton" onClick={() => this.connect()}>Connect</button>
        <br />
        <br />
        <div>
          Current Port:&nbsp;
          {portName || 'None Detected!'}
        </div>

        <div style={{ display: portName ? 'block' : 'none' }}>
          <div>
            Serial number:&nbsp;
            {serialNumber}
          </div>
          <br />

          <CollapseSection title="Components">
            <div>
              <input id="heading" type="checkbox" defaultChecked />
              <label htmlFor="heading">Heading</label>
              ,
              <input id="pitch" type="checkbox" defaultChecked />
              <label htmlFor="pitch">Pitch</label>
              ,
              <input id="roll" type="checkbox" defaultChecked />
              <label htmlFor="roll">Roll</label>
            </div>

            <div>
              <input id="mag" type="checkbox" onChange={() => this.magChboxUpd()} />
              <label htmlFor="mag">Magnetometer</label>
              <span style={{ display: magCmp ? 'inline' : 'none' }}>
                &nbsp;(
                <input id="magX" type="checkbox" defaultChecked />
                <label htmlFor="magX">X</label>
                ,&nbsp;
                <input id="magY" type="checkbox" defaultChecked />
                <label htmlFor="magY">Y</label>
                ,&nbsp;
                <input id="magZ" type="checkbox" defaultChecked />
                <label htmlFor="magZ">Z</label>
                )
              </span>
            </div>

            <div>
              <input id="accel" type="checkbox" onChange={() => this.accelChBoxUdp()} />
              <label htmlFor="accel">Accelerometer</label>
              <span style={{ display: accelCmp ? 'inline' : 'none' }}>
                &nbsp;(
                <input id="accelX" type="checkbox" defaultChecked />
                <label htmlFor="accelX">X</label>
                ,&nbsp;
                <input id="accelY" type="checkbox" defaultChecked />
                <label htmlFor="accelY">Y</label>
                ,&nbsp;
                <input id="accelZ" type="checkbox" defaultChecked />
                <label htmlFor="accelZ">Z</label>
                )
              </span>
            </div>

            <div>
              <input id="gyro" type="checkbox" onChange={() => this.gyroChBocUpd()} />
              <label htmlFor="gyro">Gyroscope</label>
              <span style={{ display: gyroCmp ? 'inline' : 'none' }}>
                &nbsp;(
                <input id="gyroX" type="checkbox" defaultChecked />
                <label htmlFor="gyroX">X</label>
                ,&nbsp;
                <input id="gyroY" type="checkbox" defaultChecked />
                <label htmlFor="gyroY">Y</label>
                ,&nbsp;
                <input id="gyroZ" type="checkbox" defaultChecked />
                <label htmlFor="gyroZ">Z</label>
                )
              </span>
            </div>

            <div>
              <input id="quaternion" type="checkbox" />
              <label htmlFor="quaternion">Quaternion</label>
            </div>

            <div>
              <input id="temperature" type="checkbox" />
              <label htmlFor="temperature">Temperature</label>
            </div>

            <div>
              <input id="other" type="checkbox" onChange={() => this.otherCmpsChBoxUdp()} />
              <label htmlFor="other">Other</label>
              <span style={{ display: otherCmps ? 'inline' : 'none' }}>
                &nbsp;(
                <input id="distortion" type="checkbox" />
                <label htmlFor="distortion">Distortion</label>
                ,&nbsp;
                <input id="calStatus" type="checkbox" />
                <label htmlFor="calStatus">Cal Status</label>
                ,&nbsp;
                <input id="headingStatus" type="checkbox" />
                <label htmlFor="headingStatus">Heading Status</label>
                )
              </span>
            </div>

            <div>
              <input id="customList" type="checkbox" onChange={() => this.custonListChBoxUpd()} />
              <label htmlFor="customList">Custom List</label>
              <span style={{ display: customListCmp ? 'inline' : 'none' }}>
                &nbsp;
                <input style={{ width: '300px' }} placeholder="Comma seperated list" onChange={(evt) => { this.customListInput = evt.target.value; }} />
              </span>
            </div>
            <div style={{ marginTop: '4px' }}>
              <button type="button" onClick={() => this.updateComponents()}>Set Components</button>
            </div>
          </CollapseSection>

          <CollapseSection title="Acquisition Parameters">
            <div className="acq-params-grid">
              <div className="acq-params-grid-name">Acquisition Mode</div>
              <div className="acq-params-grid-input">
                <span>
                  <input
                    type="radio"
                    name="isPollMode"
                    id="pollMode"
                    checked={isPollModeValueToShow}
                    onChange={() => this.isPollModeUpdate(true)}
                  />
                  <label htmlFor="pollMode">Polled</label>
                </span>
                <span style={{ marginLeft: '8px' }}>
                  <input
                    type="radio"
                    name="isPollMode"
                    id="ctsMode"
                    checked={!isPollModeValueToShow}
                    onChange={() => this.isPollModeUpdate(false)}
                  />
                  <label htmlFor="ctsMode">Continuous</label>
                </span>
              </div>

              <label className="acq-params-grid-name" htmlFor="flushFilters">Flush Filters</label>
              <input className="acq-params-grid-input" id="flushFilters" checked={flushFilters} type="checkbox" onChange={(evt) => this.setState({ flushFilters: evt.target.checked })} />

              <span className="acq-params-grid-name">Sample Delay</span>
              <input
                className="acq-params-grid-input"
                style={{ width: '100px' }}
                value={sampleDelay}
                type="number"
                step="0.1"
                onChange={(evt) => this.setState({ sampleDelay: Number(evt.target.value) })}
              />
            </div>

            <div style={{ marginTop: '4px' }}>
              <button type="button" onClick={() => this.updateAcqParams()}>Update Acquisition Parameters</button>
            </div>
          </CollapseSection>

          <CollapseSection title="Data" isOpened>
            <div>
              <button type="button" style={{ marginBottom: '8px' }} onClick={() => this.requestData()}>{dataModeStr}</button>
              <table
                id="logging-table"
                style={{
                  height: '300px',
                  maxHeight: '300px',
                  overflowY: 'scroll',
                  display: 'block',
                  border: '1px solid black',
                  fontSize: '14px',
                  marginBottom: '2px',
                }}
              >
                <tbody>
                  {data.map((item) => {
                    if (item) {
                      return (
                        <tr key={item.key}>
                          <td style={{ verticalAlign: 'text-top' }}><b>{item.ts}</b></td>
                          <td>{consoleDecoded ? item.decoded : item.raw}</td>
                        </tr>
                      );
                    }
                    return null;
                  })}
                </tbody>
              </table>
              <span>
                <input
                  type="radio"
                  name="consoleDecoded"
                  id="decoded"
                  checked={consoleDecoded}
                  onChange={() => this.consoleDecodedChange(true)}
                />
                <label htmlFor="decoded">Decoded</label>
              </span>
              <span style={{ marginLeft: '8px' }}>
                <input
                  type="radio"
                  name="consoleDecoded"
                  id="raw"
                  checked={!consoleDecoded}
                  onChange={() => this.consoleDecodedChange(false)}
                />
                <label htmlFor="raw">Raw</label>
              </span>
              <span style={{ float: 'right' }}>
                <button style={{ marginRight: '4px' }} type="button" onClick={() => this.clearData()} disabled={data.length === 0}>Clear</button>
                <button type="button" onClick={() => this.exportData()} disabled={data.length === 0}>Export</button>
              </span>
            </div>
          </CollapseSection>
        </div>
      </div>
    );
  }
}

export default App;
