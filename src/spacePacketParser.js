// parses Space Packets
const {
    PRIMARY_HEADER_LEN,
    SECONDARY_HEADER_LEN,
    USER_DATA_FIELD_MAX_LEN,
    VERSION_1_VAL,
    TYPE_VAL,
    SECONDARY_HEADER_FLAG_VAL,
    SEQUENCE_COUNT_MAX,
    GRB_VERSION_VAL,
} = require('./constants').spacePacketConstants;
const { primaryHeaderFields, secondaryHeaderFields } = require('./constants').spacePacketFields;
const { parseBitFields } = require('./utils');

const validateSpacePacketHeaders = (primaryHeader, secondaryHeader) => {
    // check secondary header flag
    if (primaryHeader.versionNum !== VERSION_1_VAL) throw new Error('Space Packet version Number is not 1');
    if (primaryHeader.type !== TYPE_VAL) throw new Error('Space Packet type is not 0');
    if (primaryHeader.secondaryHeaderFlag !== SECONDARY_HEADER_FLAG_VAL) throw new Error("Secondary Header Flag should be 1 for all Space Packets");
    if (primaryHeader.sequenceCount > SEQUENCE_COUNT_MAX) throw new Error('Sequence Count is greater than the maximum allowed value');
    if (secondaryHeader.grbVersion !== GRB_VERSION_VAL) throw new Error('GRB Version is not 0');
}

const parseSpacePacketHeaderSlice = (binarySpacePacket) => {
    let binPointer = 0;
    const primaryHeader = parsePrimaryHeader(binarySpacePacket.slice(0, PRIMARY_HEADER_LEN));
    binPointer += PRIMARY_HEADER_LEN;
    const secondaryHeader = parseSecondaryHeader(binarySpacePacket.slice(binPointer, binPointer + SECONDARY_HEADER_LEN));
    binPointer += SECONDARY_HEADER_LEN;
    const userData = binarySpacePacket.slice(binPointer, binarySpacePacket.length);

    validateSpacePacketHeaders(primaryHeader, secondaryHeader);

    // check if the data length in the primary header matches the actual data length
    // dataLength = User Data Length - Primary Header Length - 1 byte
    const dataLength = primaryHeader.dataLength*8-SECONDARY_HEADER_LEN+8; // in bits
    if (dataLength > USER_DATA_FIELD_MAX_LEN) throw new Error("Data Length is greater than the maximum allowed length");
    let spaceData;
    let remBits = 0;
    if (userData.length >= dataLength) {
        // user data length is within expected range
        spaceData = userData.slice(0, dataLength);
    } else {
        // user data length is less than expected
        // console.log("User Data Length is less than expected (APID: " + primaryHeader.apid + ")");
        remBits = dataLength - userData.length;
        spaceData = userData;
    }

    return {
        primaryHeader,
        secondaryHeader,
        spaceData,
        remBits
    };
}

const parsePrimaryHeader = (binaryPrimaryHeader) => {
    primaryHeader = parseBitFields(binaryPrimaryHeader, primaryHeaderFields);
    if (primaryHeader.length !== PRIMARY_HEADER_LEN) throw new Error('Primary Header length is not correct');
    return primaryHeader;
}

const parseSecondaryHeader = (binarySecondaryHeader) => {
    const secondaryHeader = parseBitFields(binarySecondaryHeader, secondaryHeaderFields);
    if (secondaryHeader.length !== SECONDARY_HEADER_LEN) throw new Error('Secondary Header length is not correct');
    return secondaryHeader;
}

module.exports = {
    parseSpacePacketHeaderSlice
}
