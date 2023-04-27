import {genericPayloadFields} from "./constants.js";
import {parseBitFields, parseByteFields, secEpochToDate} from "./utils.js";
import {genericDataConstants} from "./constants.js";
import {
    midHiProtonDataFields,
    lowProtonDataFields,
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

export const getMidHiProton = (midHiProtonSpacePacket) => {
    const parsedData = parseByteFields(midHiProtonSpacePacket.data, midHiProtonDataFields, true);
    // TODO: check quality flags

    const energyBands = [
        { lower: 80, upper: 115 },
        { lower: 115, upper: 165 },
        { lower: 165, upper: 235 },
        { lower: 235, upper: 340 },
        { lower: 340, upper: 500 },
        { lower: 500, upper: 700 },
        { lower: 700, upper: 1000 },
        { lower: 1000, upper: 1900 },
        { lower: 1900, upper: 3200 },
        { lower: 3200, upper: 6500 },
        { lower: 6500, upper: 10000 },
    ];

    let protonFlux_50_100 = 0;
    let protonFlux_above100 = 0;

    const matrix = parsedData.DiffProtonFluxes;
    const direction = 5;
    for (let i = 0; i < direction; i++) {
        // console.log(matrix[i])
        protonFlux_50_100 += calculateProtonFlux(matrix[i], { lower: 50*1000, upper: 100*1000 }, energyBands);
        protonFlux_above100 += calculateProtonFlux(matrix[i], { lower: 100*1000, upper: Infinity }, energyBands);
    }

    return {
        date: secEpochToDate(parsedData.L1a_SciData_TimeStamp),
        protonFlux_50_100: protonFlux_50_100,
        protonFlux_above100: protonFlux_above100
    }
};

export const getLowProton = (lowProtonSpacePacket) => {
    const parsedData = parseByteFields(lowProtonSpacePacket.data, lowProtonDataFields, true);
    // TODO: check quality flags
    return {
        date: secEpochToDate(lowProtonSpacePacket.header.secEpoch),
        value: null
    }
};

export const getXRay = (xRaySpacePacket) => {
    const parsedData = parseByteFields(xRaySpacePacket.data, xRayDataFields, true);
    // TODO: check quality flags
    return {
        date: secEpochToDate(xRaySpacePacket.header.secEpoch),
        value: parsedData.irradiance_xrsb1
    }
};

export const getSolarGalacticProton = (midHiProtonSpacePacket) => {
    const parsedData = parseByteFields(midHiProtonSpacePacket.data, solarGalacticProtonDataFields, true);
    // TODO: check quality flags
    const t1_diff_flux = parsedData.T1_DifferentialProtonFluxes; // 2by6 matrix, 2 sensors, 6 energy bands
    const t2_diff_flux = parsedData.T2_DifferentialProtonFluxes; // 2by2 matrix, 2 sensors, 2 energy bands
    const t3_diff_flux = parsedData.T3_DifferentialProtonFluxes; // 2by5 matrix, 2 sensors, 5 energy bands

    const t3_500_integral_flux = parsedData.T3P11_IntegralProtonFlux // cm-2 sr-1 s-1

    // Merge the differential proton flux matrices
    const diffFluxMatrix = [
        t1_diff_flux[0].concat(t2_diff_flux[0]).concat(t3_diff_flux[0]),
        t1_diff_flux[1].concat(t2_diff_flux[1]).concat(t3_diff_flux[1]),
    ];
    
    const energyBands = [ // in MeV
        { lower: 1, upper: 1.9 },
        { lower: 1.9, upper: 2.3 },
        { lower: 2.3, upper: 3.4 },
        { lower: 3.4, upper: 6.5 },
        { lower: 6.5, upper: 12 },
        { lower: 12, upper: 25 },
        { lower: 25, upper: 40 },
        { lower: 40, upper: 83 },
        { lower: 83, upper: 99 },
        { lower: 99, upper: 118 },
        { lower: 118, upper: 150 },
        { lower: 150, upper: 275 },
        { lower: 275, upper: 500 },
    ];

    // Calculate proton flux for the specified energy ranges
    const protonFlux_10MeV = calculateProtonFlux(diffFluxMatrix, energyBands, 10, Infinity)+t3_500_integral_flux;
    const protonFlux_50MeV = calculateProtonFlux(diffFluxMatrix, energyBands, 50, Infinity)+t3_500_integral_flux;
    const protonFlux_100MeV = calculateProtonFlux(diffFluxMatrix, energyBands, 100, Infinity)+t3_500_integral_flux;

    return {
        date: secEpochToDate(parsedData.L1a_SciData_TimeStamp),
        proton10: protonFlux_10MeV,
        proton50: protonFlux_50MeV,
        proton100: protonFlux_100MeV
    }
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
