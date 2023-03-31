const {
    COMPRESS_ALGO_LEN,
    SEC_EPOCH_LEN,
    MICRO_SEC_LEN,
    RESERVED_LEN,
    DATA_UNIT_SEQ_COUNT_LEN,
} = require('./constants.js').genericDataConstants;

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

module.exports = {
    parseGenericData
};