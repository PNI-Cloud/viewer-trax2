export default class DataBuffer {
  maxLength: number;

  public buffer: Array<Uint8Array>;

  partial: Uint8Array;

  constructor(maxLength: number) {
    this.maxLength = maxLength;
    this.buffer = [];
    this.partial = new Uint8Array();
  }

  validate(data: Uint8Array) {
    if (data[1] === data.length) {
      return true;
    }
    return false;
  }

  add(data: Uint8Array) {
    let packet = this.validate(data) ? data : undefined;
    if (!packet) {
      const extended = new Uint8Array([...this.partial, ...data]);
      if (this.validate(extended)) {
        packet = extended;
      }
    }
    if (!packet) { this.partial = data; return; }

    this.buffer.push(packet);
    while (this.buffer.length > this.maxLength) {
      this.buffer.shift();
    }
  }
}
