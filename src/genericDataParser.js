const {genericPayloadFields} = require('./constants.js');
const {parseBitFields, parseByteFields} = require('./utils.js');
const {GENERIC_HEADER_LEN} = require('./constants.js').genericDataConstants;
const {
    midHiProtonDataFields,
    lowProtonDataFields,
    xRayDataFields
} = require('./constants.js');

const parseHeader = (spaceData) => {
    return parseBitFields(spaceData, genericPayloadFields);
}

const parseGenericData = (spaceData) => {
    const length = spaceData.length;
    const header = parseHeader(spaceData.slice(0, GENERIC_HEADER_LEN));
    const data = spaceData.slice(header.length, spaceData.length);
    return {
        header,
        data,
        length
    };
}

const parseMidHiProton = (midHiProtonBinStr) => {
    return parseByteFields(midHiProtonBinStr, midHiProtonDataFields, littleEndian=true);
};

const parseLowProton = (lowProtonBinStr) => {
    return parseByteFields(lowProtonBinStr, lowProtonDataFields, littleEndian=true);
};

const parseXRay = (xRayBinStr) => {
    return parseByteFields(xRayBinStr, xRayDataFields, littleEndian=true);
};

const parseXRayMeta = (xRayMetaBinStr) => {
    return xRayMetaBinStr;
};

const parseProtonLowMeta = (protonLowMetaBinStr) => {
    return protonLowMetaBinStr;
};

const parseProtonMedHiMeta = (protonMidHiMetaBinStr) => {
    return protonMidHiMetaBinStr;
};

module.exports = {
    parseGenericData,
    parseMidHiProton,
    parseLowProton,
    parseXRay,
    parseXRayMeta,
    parseProtonLowMeta,
    parseProtonMedHiMeta
};