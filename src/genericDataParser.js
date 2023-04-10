const {
    COMPRESS_ALGO_LEN,
    SEC_EPOCH_LEN,
    MICRO_SEC_LEN,
    RESERVED_LEN,
    DATA_UNIT_SEQ_COUNT_LEN,
} = require('./constants.js').genericDataConstants;

const {
    midHiProtonDataFields,
    lowProtonDataFields,
    xRayDataFields
} = require('./constants.js');

const parseHeader = (spaceData) => {
    let bitPointer = 0;
    const compress_algo = spaceData.slice(bitPointer, bitPointer + COMPRESS_ALGO_LEN);
    bitPointer += COMPRESS_ALGO_LEN;
    const sec_epoch = spaceData.slice(bitPointer, bitPointer + SEC_EPOCH_LEN);
    bitPointer += SEC_EPOCH_LEN;
    const micro_sec = spaceData.slice(bitPointer, bitPointer + MICRO_SEC_LEN);
    bitPointer += MICRO_SEC_LEN;
    const reserved = spaceData.slice(bitPointer, bitPointer + RESERVED_LEN);
    bitPointer += RESERVED_LEN;
    const data_unit_seq_count = spaceData.slice(bitPointer, bitPointer + DATA_UNIT_SEQ_COUNT_LEN);
    bitPointer += DATA_UNIT_SEQ_COUNT_LEN;

    return {
        compress_algo,
        sec_epoch,
        micro_sec,
        reserved,
        data_unit_seq_count,
    };
}

const parseGenericData = (spaceData) => {
    const header = parseHeader(spaceData);
    const data = spaceData.slice(header.length, spaceData.length);
    return {
        header,
        data,
    };
}

const binaryStringToByteArray = (binaryString) => {
    const byteArray = new Uint8Array(binaryString.length / 8);
    for (let i = 0; i < binaryString.length; i += 8) {
      byteArray[i / 8] = parseInt(binaryString.slice(i, i + 8), 2);
    }
    return byteArray;
};
  
const readBytes = (buffer, byteOffset, size, dataType) => {
    const view = new DataView(buffer);
    let littleEndian = size > 4;
  
    switch (dataType) {
        case 'uint64':
            return view.getBigUint64(byteOffset, littleEndian);
        case 'float':
            return view.getFloat32(byteOffset, littleEndian);
        case 'float32':
            return view.getFloat32(byteOffset, littleEndian);
        case 'float64':
            return view.getFloat64(byteOffset, littleEndian);
        case 'uint8':
            return view.getUint8(byteOffset, littleEndian);
        case 'uint16':
            return view.getUint16(byteOffset, littleEndian);
        case 'uint32':
            return view.getUint32(byteOffset, littleEndian);
        case 'unit64':
            return view.getUint64(byteOffset, littleEndian);
        case 'double':
            return view.getFloat64(byteOffset, littleEndian);
        default:
            throw new Error(`Unsupported data type: ${dataType}`);
    }
};

const parseDataFields = (binaryString, dataFields) => {
    const byteArray = binaryStringToByteArray(binaryString);
    const buffer = byteArray.buffer;
    const result = {};
  
    for (const field of dataFields) {
        result[field.name] = readBytes(buffer, field.byteOffset, field.size, field.dataType);
    }
  
    return result;
};

const parseMidHiProton = (midHiProtonBinStr) => {
    return parseDataFields(midHiProtonBinStr, midHiProtonDataFields);
};

const parseLowProton = (lowProtonBinStr) => {
    return parseDataFields(lowProtonBinStr, lowProtonDataFields);
};

const parseXRay = (xRayBinStr) => {
    return parseDataFields(xRayBinStr, xRayDataFields);
};

module.exports = {
    parseGenericData,
    parseMidHiProton,
    parseLowProton,
    parseXRay,
};