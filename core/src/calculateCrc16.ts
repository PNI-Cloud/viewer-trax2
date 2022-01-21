/**
 * Update the CRC for transmitted and received data using
 * the CCITT 16bit algorithm (X^16 + X^12 + X^5 + 1).
 * @param bytes Array of bytes to calculate crc16 on.
 */
export default function calculateCrc16(bytes: Uint8Array) {
  let crc = 0;
  for (let i = 0; i < bytes.byteLength; i++) {
    crc = ((crc >> 8) | (crc << 8)) & 0xFFFF; // // Force uint16_t
    crc ^= bytes[i];
    crc ^= (crc & 0xff) >> 4;
    crc = (crc ^ (crc << 8) << 4) & 0xFFFF; // Force uint16_t
    crc ^= ((crc & 0xff) << 4) << 1;
  }
  return crc;
}
