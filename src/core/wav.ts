const BYTES_PER_SAMPLE = 2;
const HEADER_SIZE = 44;

export function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const blockAlign = numChannels * BYTES_PER_SAMPLE;
  const dataLength = buffer.length * blockAlign;

  const arrayBuffer = new ArrayBuffer(HEADER_SIZE + dataLength);
  const view = new DataView(arrayBuffer);

  writeWavHeader(view, buffer.sampleRate, numChannels, blockAlign, dataLength);
  writeInterleavedSamples(view, buffer, numChannels);

  return new Blob([arrayBuffer], { type: "audio/wav" });
}

function writeWavHeader(
  view: DataView,
  sampleRate: number,
  numChannels: number,
  blockAlign: number,
  dataLength: number
): void {
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, "WAVE");
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, "data");
  view.setUint32(40, dataLength, true);
}

function writeInterleavedSamples(view: DataView, buffer: AudioBuffer, numChannels: number): void {
  const channelData: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) channelData.push(buffer.getChannelData(ch));

  let offset = HEADER_SIZE;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      view.setInt16(offset, floatToPcm16(channelData[ch][i]), true);
      offset += BYTES_PER_SAMPLE;
    }
  }
}

function floatToPcm16(sample: number): number {
  const s = Math.max(-1, Math.min(1, sample));
  return s < 0 ? s * 0x8000 : s * 0x7fff;
}

function writeString(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
}
