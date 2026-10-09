// Code-native pixel mascot. Keep every Windows icon size crisp and transparent.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const directory = path.join(__dirname, '../src/assets');
fs.mkdirSync(directory, { recursive: true });
function crc(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) {
    value ^= byte;
    for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  }
  return (value ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const type = Buffer.from(name), length = Buffer.alloc(4), checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length); checksum.writeUInt32BE(crc(Buffer.concat([type, data])));
  return Buffer.concat([length, type, data, checksum]);
}
function render(size) {
  const pixels = Buffer.alloc(size * (size * 4 + 1));
  const shapes = [
    [14,2,3,5,'#b9a2ff'], [17,2,5,2,'#b9a2ff'], [21,3,3,3,'#ffe6a0'],
    [5,7,22,2,'#151923'], [3,9,26,15,'#151923'], [5,24,22,2,'#151923'],
    [5,9,22,2,'#d6c6ff'], [5,11,2,11,'#ad8cec'], [25,11,2,11,'#ad8cec'],
    [7,11,18,11,'#242635'], [5,22,22,2,'#9d7ddc'],
    [9,14,3,4,'#e5dbff'], [20,14,3,4,'#e5dbff'],
    [13,18,2,2,'#b9a2ff'], [15,20,4,1,'#b9a2ff'], [19,18,2,2,'#b9a2ff'],
    [8,19,3,1,'#f0a6c1'], [22,19,2,1,'#f0a6c1'],
    [11,26,10,3,'#b9a2ff'], [9,29,5,2,'#151923'], [18,29,5,2,'#151923'],
  ].map(([x,y,w,h,color]) => [x,y,w,h,Buffer.from(color.slice(1),'hex')]);
  for (let y=0; y<size; y++) for (let x=0; x<size; x++) {
    const px=(x+.5)*32/size, py=(y+.5)*32/size;
    let color;
    for (const [sx,sy,w,h,rgb] of shapes) if(px>=sx&&px<sx+w&&py>=sy&&py<sy+h) color=rgb;
    if(color) { const offset=y*(size*4+1)+1+x*4; color.copy(pixels,offset); pixels[offset+3]=255; }
  }
  const header=Buffer.alloc(13); header.writeUInt32BE(size); header.writeUInt32BE(size,4); header[8]=8; header[9]=6;
  return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',header),chunk('IDAT',zlib.deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]);
}
const sizes=[16,24,32,48,64,128,256], frames=sizes.map(render);
const header=Buffer.alloc(6+sizes.length*16); header.writeUInt16LE(1,2); header.writeUInt16LE(sizes.length,4);
let offset=header.length;
frames.forEach((frame,index)=>{const entry=6+index*16,size=sizes[index];header[entry]=header[entry+1]=size===256?0:size;header.writeUInt16LE(1,entry+4);header.writeUInt16LE(32,entry+6);header.writeUInt32LE(frame.length,entry+8);header.writeUInt32LE(offset,entry+12);offset+=frame.length;});
fs.writeFileSync(path.join(directory,'petio.ico'),Buffer.concat([header,...frames]));
fs.writeFileSync(path.join(directory,'petio.png'),frames.at(-1));
console.log('Built Petio PNG and seven-resolution Windows icon.');
