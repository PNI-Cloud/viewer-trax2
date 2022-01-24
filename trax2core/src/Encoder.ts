import * as Protocol from "./Protocol";
import { calculateCrc16 } from "./calculateCrc16";
import { BytesUtility } from "./BytesUtility";

/**
 * Trax2 request encoder.
 */
export class Encoder {
  getModuleInfo() {
    return this.makeCommand(Protocol.FrameId.GetModInfo);
  }

  getSerialNumber() {
    return this.makeCommand(Protocol.FrameId.SerialNumber);
  }

  setDataComponents(componentIds: number[]) {
    return this.makeCommand(Protocol.FrameId.SetDataComponents, new Uint8Array([
      componentIds.length,
      ...componentIds,
    ]));
  }

  /**
   * This frame sets the sensor acquisition parameters in the TRAX2.
   * @param isPollMode This flag sets whether output will be presented in Continuous or Polled Acquisition Mode.
   *  Poll Mode is TRUE and should be selected when the host system will poll the TRAX2 for each data set.
   *  Continuous Mode is FALSE and should be selected if the user will have the TRAX2 output data to the
   *  host system at a relatively fixed rate. Poll Mode is the default.
   * @param flushFilters This is only relevant in Compass Mode. Setting this flag to TRUE results in the
   *  FIR filter being flushed (cleared) after every measurement. The default is FALSE. Flushing the filter
   *  clears all tap values, thus purging old data. This can be useful if a significant change in heading has
   *  occurred since the last reading, as the old heading data would be in the filter. Once the taps are cleared,
   *  it is necessary to fully repopulate the filter before data is output. For example, if 32 FIR taps is set,
   *  32 new samples must be taken before a reading will be output. The length of the delay before outputting data
   *  is directly correlated to the number of FIR taps.
   * @param SampleDelay The SampleDelay is relevant when the Continuous Acquisition Mode is selected. It is
   *  the time delay, in seconds, between completion of TRAX2 sending one set of data and the start of sending
   *  the next data set. The default is 0 seconds, which means TRAX2 will send new data as soon as the previous
   *  data set has been sent. Note that the inverse of the SampleDelay is somewhat greater than the actual sample
   *  rate, since the SampleDelay does not include actual acquisition time.
   */
  setAcquisitionParams(isPollMode: boolean, flushFilters = false, SampleDelay = 0) {
    return this.makeCommand(Protocol.FrameId.SetAcqParams, new Uint8Array([
      isPollMode ? 1 : 0,
      flushFilters ? 1 : 0,
      0x00, 0x00, 0x00, 0x00,
      ...BytesUtility.floatToBytes(SampleDelay),
    ]));
  }

  getAcquisitionParams() {
    return this.makeCommand(Protocol.FrameId.GetAcqParams);
  }

  // If the TRAX2 is configured to operate in Polled Acquisition Mode (see kSetAcqParams),
  // then this frame requests a single measurement data set. The frame has no payload.
  getData() {
    return this.makeCommand(Protocol.FrameId.GetData);
  }

  // Commands the TRAX2 to output data at a fixed interval
  startContinuousMode() {
    return this.makeCommand(Protocol.FrameId.StartContinuousMode);
  }

  // Stops data output when in Continuous Mode
  stopContinuousMode() {
    return this.makeCommand(Protocol.FrameId.StopContinuousMode);
  }

  setDeclination(value: number) {
    return this.makeCommand(Protocol.FrameId.SetConfig, new Uint8Array([
      Protocol.ConfigId.Declination,
      ...BytesUtility.floatToBytes(value),
    ]));
  }

  getDeclination() {
    return this.makeCommand(Protocol.FrameId.GetConfig, new Uint8Array([
      Protocol.ConfigId.Declination,
    ]));
  }

  setUserCalAutoSampling(enabled: boolean) {
    return this.makeCommand(Protocol.FrameId.GetConfig, new Uint8Array([
      Protocol.ConfigId.UserCalAutoSampling,
      (enabled) ? 1 : 0,
    ]));
  }

  resetRef() {
    return this.makeCommand(Protocol.FrameId.SetResetRef);
  }

  setFunctionalMode(isAhrsMode: boolean) {
    return this.makeCommand(Protocol.FrameId.SetFunctionalMode, new Uint8Array([
      isAhrsMode ? 1 : 0,
    ]));
  }

  getFunctionalMode() {
    return this.makeCommand(Protocol.FrameId.GetFunctionalMode);
  }

  save() {
    return this.makeCommand(Protocol.FrameId.Save);
  }

  startCal(option: number) {
    return this.makeCommand(Protocol.FrameId.StartCal, BytesUtility.uint32ToBytes(option));
  }

  takeUserCalSample() {
    return this.makeCommand(Protocol.FrameId.TakeUserCalSample);
  }

  stopCal() {
    return this.makeCommand(Protocol.FrameId.StopCal);
  }

  private makeCommand(id: number, payload: Uint8Array = new Uint8Array([])) {
    const byteCount = BytesUtility.uint16ToBytes(payload.length + 5);
    const frame = new Uint8Array([...byteCount, id, ...payload]);
    const crc16 = BytesUtility.uint16ToBytes(calculateCrc16(frame));
    // console.log(id, payload, byteCount, frame, crc16)
    return new Uint8Array([...frame, ...crc16]);
  }
}
