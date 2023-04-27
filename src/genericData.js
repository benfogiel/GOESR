import {genericPayloadFields} from "./constants.js";
import {parseBitFields, parseByteFields, secEpochToDate} from "./utils.js";
import {genericDataConstants} from "./constants.js";
import {
    xRayDataFields,
    solarGalacticProtonDataFields,
} from "./constants.js";

const {GENERIC_HEADER_LEN} = genericDataConstants;

function calculateProtonFlux(diffFluxMatrix, energyBands, lowerBound, upperBound) {
    let totalFlux = 0;

    for (let i = 0; i < diffFluxMatrix.length; i++) {
        for (let j = 0; j < diffFluxMatrix[i].length; j++) {
            const energyBand = energyBands[j];

            if (energyBand.lower >= lowerBound && energyBand.upper <= upperBound) {
                const binWidth = energyBand.upper - energyBand.lower;
                totalFlux += diffFluxMatrix[i][j] * binWidth;
            }
        }
    }

    return totalFlux;
}

const parseHeader = (spaceData) => {
    return parseBitFields(spaceData, genericPayloadFields);
};

export const parseGenericData = (spaceData) => {
    const length = spaceData.length;
    const header = parseHeader(spaceData.slice(0, GENERIC_HEADER_LEN));
    const data = spaceData.slice(header.length, spaceData.length);
    return {
        header,
        data,
        length,
    };
};

export const getXRay = (xRaySpacePacket) => {
    const parsedData = parseByteFields(xRaySpacePacket.data, xRayDataFields, true);
    // TODO: check quality flags
    return {
        date: secEpochToDate(xRaySpacePacket.header.secEpoch),
        value: parsedData.irradiance_xrsb1,
    };
};

export const getSolarGalacticProton = (midHiProtonSpacePacket) => {
    const parsedData = parseByteFields(
        midHiProtonSpacePacket.data, solarGalacticProtonDataFields, true,
    );
    // TODO: check quality flags
    const t1DiffFlux = parsedData.T1_DifferentialProtonFluxes; // 2by6 matrix, 2 sensors, 6 energy bands
    const t2DiffFlux = parsedData.T2_DifferentialProtonFluxes; // 2by2 matrix, 2 sensors, 2 energy bands
    const t3DiffFlux = parsedData.T3_DifferentialProtonFluxes; // 2by5 matrix, 2 sensors, 5 energy bands

    const integral500flux = parsedData.T3P11_IntegralProtonFlux; // cm-2 sr-1 s-1

    // Merge the differential proton flux matrices
    const diffFluxMatrix = [
        t1DiffFlux[0].concat(t2DiffFlux[0]).concat(t3DiffFlux[0]),
        t1DiffFlux[1].concat(t2DiffFlux[1]).concat(t3DiffFlux[1]),
    ];

    const energyBands = [ // in MeV
        {lower: 1, upper: 1.9},
        {lower: 1.9, upper: 2.3},
        {lower: 2.3, upper: 3.4},
        {lower: 3.4, upper: 6.5},
        {lower: 6.5, upper: 12},
        {lower: 12, upper: 25},
        {lower: 25, upper: 40},
        {lower: 40, upper: 83},
        {lower: 83, upper: 99},
        {lower: 99, upper: 118},
        {lower: 118, upper: 150},
        {lower: 150, upper: 275},
        {lower: 275, upper: 500},
    ];

    // Calculate proton flux for the specified energy ranges
    const protonFlux10MeV = calculateProtonFlux(
        diffFluxMatrix, energyBands, 10, Infinity,
    )+integral500flux;
    const protonFlux50MeV = calculateProtonFlux(
        diffFluxMatrix, energyBands, 50, Infinity,
    )+integral500flux;
    const protonFlux100MeV = calculateProtonFlux(
        diffFluxMatrix, energyBands, 100, Infinity,
    )+integral500flux;

    return {
        date: secEpochToDate(parsedData.L1a_SciData_TimeStamp),
        proton10: protonFlux10MeV,
        proton50: protonFlux50MeV,
        proton100: protonFlux100MeV,
    };
};

export const parseXRayMeta = (xRayMetaBinStr) => {
    return xRayMetaBinStr;
};

export const parseProtonLowMeta = (protonLowMetaBinStr) => {
    return protonLowMetaBinStr;
};

export const parseProtonMedHiMeta = (protonMidHiMetaBinStr) => {
    return protonMidHiMetaBinStr;
};
