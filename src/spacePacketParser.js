// parses Space Packets
const {
    M_PDU_PACKET_LEN,
    PRIMARY_HEADER_LEN,
    VERSION_NUM_LEN,
    TYPE_LEN,
    SECONDARY_HEADER_FLAG_LEN,
    APID_LEN,
    SEQUENCE_FLAGS_LEN,
    SEQUENCE_COUNT_LEN,
    DATA_LENGTH_LEN,
    SECONDARY_HEADER_LEN,
    DAYS_SINCE_EPOCH_LEN,
    MILLISECONDS_OF_DAY_LEN,
    GRB_VERSION_LEN,
    GRB_PAYLOAD_VARIANT_LEN,
    ASSEMBLER_ID_LEN,
    SYSTEM_ENV_LEN,
    USER_DATA_FIELD_MAX_LEN,
    VERSION_1_VAL,
} = require('./constants').spacePacketConstants;

const parseSpacePacketHeaderSlice = (binarySpacePacket) => {
    let binPointer = 0;
    const primaryHeader = parsePrimaryHeader(binarySpacePacket.slice(0, PRIMARY_HEADER_LEN));
    binPointer += PRIMARY_HEADER_LEN;
    // check secondary header flag
    if (primaryHeader.secondaryHeaderFlag !== "1") throw new Error("Secondary Header Flag should be 1 for all Space Packets");
    const secondaryHeader = parseSecondaryHeader(binarySpacePacket.slice(binPointer, binPointer + SECONDARY_HEADER_LEN));
    binPointer += SECONDARY_HEADER_LEN;
    const userData = binarySpacePacket.slice(binPointer, binarySpacePacket.length);

    // check if the data length in the primary header matches the actual data length
    // dataLength is the User Data Length - Primary Header Length - 1 byte
    let numRemDataBits;
    const dataLength = parseInt(primaryHeader.dataLength,2)*8-SECONDARY_HEADER_LEN+8; // in bits
    if (dataLength > USER_DATA_FIELD_MAX_LEN) throw new Error("Data Length is greater than the maximum allowed length");
    let spaceData;
    if (userData.length >= dataLength) {
        // we have a full space packet
        spaceData = userData.slice(0, dataLength);
        numRemDataBits = 0;
    } else {
        // we have a partial space packet
        spaceData = userData;
        numRemDataBits = dataLength - spaceData.length;
    }

    return {
        primaryHeader,
        secondaryHeader,
        spaceData,
        numRemDataBits,
    };
}


const parsePrimaryHeader = (binaryPrimaryHeader) => {
    let binPointer = 0;
    const versionNum = binaryPrimaryHeader.slice(binPointer, binPointer + VERSION_NUM_LEN);
    if (versionNum !== VERSION_1_VAL) throw new Error('Space Packet version Number is not 1');
    binPointer += VERSION_NUM_LEN;
    const type = binaryPrimaryHeader.slice(binPointer, binPointer + TYPE_LEN);
    binPointer += TYPE_LEN;
    const secondaryHeaderFlag = binaryPrimaryHeader.slice(binPointer, binPointer + SECONDARY_HEADER_FLAG_LEN);
    binPointer += SECONDARY_HEADER_FLAG_LEN;
    const apid = binaryPrimaryHeader.slice(binPointer, binPointer + APID_LEN);
    binPointer += APID_LEN;
    const sequenceFlags = binaryPrimaryHeader.slice(binPointer, binPointer + SEQUENCE_FLAGS_LEN);
    binPointer += SEQUENCE_FLAGS_LEN;
    const sequenceCount = binaryPrimaryHeader.slice(binPointer, binPointer + SEQUENCE_COUNT_LEN);
    binPointer += SEQUENCE_COUNT_LEN;
    const dataLength = binaryPrimaryHeader.slice(binPointer, binPointer + DATA_LENGTH_LEN);
    binPointer += DATA_LENGTH_LEN;

    if (binPointer !== PRIMARY_HEADER_LEN) throw new Error('Primary Header length is not correct');

    return {
        versionNum,
        type,
        secondaryHeaderFlag,
        apid,
        sequenceFlags,
        sequenceCount,
        dataLength,
    };
}

const parseSecondaryHeader = (binarySecondaryHeader) => {
    let binPointer = 0;
    const daysSinceEpoch = binarySecondaryHeader.slice(binPointer, binPointer + DAYS_SINCE_EPOCH_LEN);
    binPointer += DAYS_SINCE_EPOCH_LEN;
    const millisecondsOfDay = binarySecondaryHeader.slice(binPointer, binPointer + MILLISECONDS_OF_DAY_LEN);
    binPointer += MILLISECONDS_OF_DAY_LEN;
    const grbVersion = binarySecondaryHeader.slice(binPointer, binPointer + GRB_VERSION_LEN);
    binPointer += GRB_VERSION_LEN;
    const grbPayloadVariant = binarySecondaryHeader.slice(binPointer, binPointer + GRB_PAYLOAD_VARIANT_LEN);
    binPointer += GRB_PAYLOAD_VARIANT_LEN;
    const assemblerId = binarySecondaryHeader.slice(binPointer, binPointer + ASSEMBLER_ID_LEN);
    binPointer += ASSEMBLER_ID_LEN;
    const systemEnv = binarySecondaryHeader.slice(binPointer, binPointer + SYSTEM_ENV_LEN);
    binPointer += SYSTEM_ENV_LEN;

    if (binPointer !== SECONDARY_HEADER_LEN) throw new Error('Secondary Header length is not correct');

    return {
        daysSinceEpoch,
        millisecondsOfDay,
        grbVersion,
        grbPayloadVariant,
        assemblerId,
        systemEnv,
    };
}

module.exports = {
    parseSpacePacketHeaderSlice
}
