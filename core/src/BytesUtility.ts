export class BytesUtility {
  static uint16ToBytes(value: number, littleEndian = false) {
    const arr = new ArrayBuffer(2);
    const view = new DataView(arr);
    view.setUint16(0, value, true);

    if (littleEndian) {
      return new Uint8Array([view.getUint8(0), view.getUint8(1)]);
    }
    return new Uint8Array([view.getUint8(1), view.getUint8(0)]);
  }

  static uint32ToBytes(value: number, littleEndian = false) {
    const arr = new ArrayBuffer(4);
    const view = new DataView(arr);
    view.setUint32(0, value, true);

    if (littleEndian) {
      return new Uint8Array([
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3),
      ]);
    }
    return new Uint8Array([
      view.getUint8(3),
      view.getUint8(2),
      view.getUint8(1),
      view.getUint8(0),
    ]);
  }

  static floatToBytes(value: number, littleEndian = false) {
    const arr = new ArrayBuffer(4);
    const view = new DataView(arr);
    view.setFloat32(0, value, true);

    if (littleEndian) {
      return new Uint8Array([
        view.getUint8(0),
        view.getUint8(1),
        view.getUint8(2),
        view.getUint8(3),
      ]);
    }
    return new Uint8Array([
      view.getUint8(3),
      view.getUint8(2),
      view.getUint8(1),
      view.getUint8(0),
    ]);
  }
}
