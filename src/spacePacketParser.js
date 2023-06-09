// parses Space Packets
import assert from "assert";

import {spacePacketConstants, spacePacketFields} from "./constants.js";
import {parseBitFields} from "./utils.js";

const {primaryHeaderFields, secondaryHeaderFields} = spacePacketFields;
const {
    PRIMARY_HEADER_LEN,
    SECONDARY_HEADER_LEN,
    USER_DATA_FIELD_MAX_LEN,
    VERSION_1_VAL,
    TYPE_VAL,
    SECONDARY_HEADER_FLAG_VAL,
    SEQUENCE_COUNT_MAX,
    GRB_VERSION_VAL,
    CRC_LEN,
} = spacePacketConstants;

const validateSpacePacketHeaders = (primaryHeader, secondaryHeader) => {
    // check secondary header flag
    if (primaryHeader.versionNum !== VERSION_1_VAL) {
        throw new Error("Space Packet version Number is not 0");
    }
    if (primaryHeader.type !== TYPE_VAL) {
        throw new Error("Space Packet type is not 0");
    }
    if (primaryHeader.secondaryHeaderFlag !== SECONDARY_HEADER_FLAG_VAL) {
        throw new Error("Secondary Header Flag should be 1 for all Space Packets");
    }
    if (primaryHeader.sequenceCount > SEQUENCE_COUNT_MAX) {
        throw new Error("Sequence Count is greater than the maximum allowed value");
    }
    if (secondaryHeader.grbVersion !== GRB_VERSION_VAL) {
        throw new Error("GRB Version is not 0");
    }
};

export const parseSpacePacketHeaderSlice = (binarySpacePacket) => {
    const binary = binarySpacePacket;
    let bitPointer = 0;
    const primaryHeader = parsePrimaryHeader(binarySpacePacket.slice(0, PRIMARY_HEADER_LEN));
    bitPointer += PRIMARY_HEADER_LEN;
    const secondaryHeader = parseSecondaryHeader(
        binarySpacePacket.slice(bitPointer, bitPointer + SECONDARY_HEADER_LEN),
    );
    bitPointer += SECONDARY_HEADER_LEN;
    const userData = binarySpacePacket.slice(bitPointer);

    validateSpacePacketHeaders(primaryHeader, secondaryHeader);

    // check if the data length in the primary header matches the actual data length
    // dataLength = User Data Length - Primary Header Length - 1 byte
    const dataLength = primaryHeader.dataLength*8-SECONDARY_HEADER_LEN+8; // in bits
    if (dataLength > USER_DATA_FIELD_MAX_LEN) {
        throw new Error("Data Length is greater than the maximum allowed length");
    }
    let spaceData;
    let remBits = 0;
    if (userData.length >= dataLength) {
        // user data length is able to fill the expected length
        spaceData = userData.slice(0, dataLength);
    } else {
        // user data length does not include the entire space packet
        remBits = dataLength - userData.length;
        spaceData = userData;
    }
    const spacePacket = {
        primaryHeader,
        secondaryHeader,
        spaceData,
        remBits,
        binary,
    };
    if (remBits === 0) {
        // we have a complete space packet, parse crc
        parseCrc(spacePacket);
    }

    return spacePacket;
};

export const appendRemBits = (spacePacket, remBits) => {
    assert(spacePacket.remBits >= remBits.length,
        "remBits length is greater than the remaining bits in the space packet");
    spacePacket.spaceData = spacePacket.spaceData.concat(remBits);
    spacePacket.binary = spacePacket.binary.concat(remBits);
    spacePacket.remBits = spacePacket.remBits - remBits.length;

    if (spacePacket.remBits === 0) {
        // we have a complete space packet, parse crc
        parseCrc(spacePacket);
    }

    return spacePacket;
};

const parseCrc = (spacePacket) => {
    assert(spacePacket.remBits === 0, "remBits is not 0");
    spacePacket.crc = spacePacket.spaceData.slice(
        spacePacket.spaceData.length - CRC_LEN
    );
    spacePacket.spaceData = spacePacket.spaceData.slice(
        0, spacePacket.spaceData.length - CRC_LEN,
    );

    // check CRC
    // TODO: CRC check is failing for all packets
    // if (!checkSum(spacePacket)) {
    //     // throw new Error("CRC check failed");
    //     console.log("CRC check failed");
    // } else {
    //     console.log("It worked!");
    // }

    return spacePacket;
};

// TODO : CRC check is failing for all packets
// const checkSum = (spacePacket) => {
//     // compile all the bits into a single string
//     let bitString = spacePacket.binary.slice(0, spacePacket.binary.length - CRC_LEN);
//     const byteArray = new Int8Array(Buffer.from(bitString, 'binary'));
//     const crc = crc32(byteArray);
//     return crc === parseInt(spacePacket.crc,2);
// }

const parsePrimaryHeader = (binaryPrimaryHeader) => {
    const primaryHeader = parseBitFields(binaryPrimaryHeader, primaryHeaderFields);
    if (primaryHeader.length !== PRIMARY_HEADER_LEN) {
        throw new Error("Primary Header length is not correct");
    }
    return primaryHeader;
};

const parseSecondaryHeader = (binarySecondaryHeader) => {
    const secondaryHeader = parseBitFields(binarySecondaryHeader, secondaryHeaderFields);
    if (secondaryHeader.length !== SECONDARY_HEADER_LEN) {
        throw new Error("Secondary Header length is not correct");
    }
    return secondaryHeader;
};
