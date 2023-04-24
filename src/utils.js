const binaryStringToByteArray = (binaryString) => {
    const byteArray = new Uint8Array(binaryString.length / 8);
    for (let i = 0; i < binaryString.length; i += 8) {
      byteArray[i / 8] = parseInt(binaryString.slice(i, i + 8), 2);
    }
    return byteArray;
};
  
const readBytes = (buffer, byteOffset, size, dataType, littleEndian = true) => {
    const slicedBuffer = buffer.slice(byteOffset, byteOffset + size);
    const view = new DataView(slicedBuffer);

    switch (dataType) {
        case 'uint8':
            return view.getUint8(0, littleEndian);
        case 'uint16':
            return view.getUint16(0, littleEndian);
        case 'uint32':
            return view.getUint32(0, littleEndian);
        case 'uint64':
            return view.getBigUint64(0, littleEndian);
        case 'float':
            return view.getFloat32(0, littleEndian);
        case 'float32':
            return view.getFloat32(0, littleEndian);
        case 'float64':
            return view.getFloat64(0, littleEndian);
        case 'double':
            return view.getFloat64(0, littleEndian);
        default:
            throw new Error(`Unsupported data type: ${dataType}`);
    }
};


const readBits = (binaryString, bitOffset, size, dataType) => {
    switch (dataType) {
        case 'bitString':
            return binaryString.slice(bitOffset, bitOffset + size);
        case 'integer':
            return parseInt(binaryString.slice(bitOffset, bitOffset + size), 2);
        default:
            throw new Error(`Unsupported data type: ${dataType}`);
    }
};

const parseByteFields = (binaryString, dataFields, littleEndian) => {
    const byteArray = binaryStringToByteArray(binaryString);
    const buffer = byteArray.buffer;
    const result = {};
    result.length = byteArray.length;
    expectedByteLength = Math.max(...dataFields.map(field => field.byteOffset + field.size));
    // if (result.length !== expectedByteLength) throw new Error(`Expected ${expectedByteLength} bytes, got ${result.length} bytes`);
  
    for (const field of dataFields) {
        result[field.name] = readBytes(buffer, field.byteOffset, field.size, field.dataType, littleEndian);
    }
  
    return result;
};

const parseBitFields = (binaryString, dataFields) => {
    const result = {};
    result.length = binaryString.length;
    expectedBitLength = Math.max(...dataFields.map(field => field.bitOffset + field.size));
    if (result.length !== expectedBitLength) throw new Error(`Expected ${expectedBitLength} bits, got ${result.length} bits`);
  
    for (const field of dataFields) {
        result[field.name] = readBits(binaryString, field.bitOffset, field.size, field.dataType);
    }
  
    return result;
}

module.exports = {
    parseByteFields,
    parseBitFields,
}