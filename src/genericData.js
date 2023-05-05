import {genericPayloadFields} from "./constants.js";
import {parseBitFields, parseByteFields, secEpochToDate, arrayToMatrix} from "./utils.js";
import {genericDataConstants} from "./constants.js";
import {
    xRayDataFields,
    solarGalacticProtonDataFields,
} from "./constants.js";

const {GENERIC_HEADER_LEN} = genericDataConstants;

/**
 * Calculate the proton flux for the specified energy range
 * @param {Array} diffFluxMatrix - 2byN matrix, 2 sensors, N energy bands in cm-2 sr-1 s-1 KeV-1
 * @param {Array} energyBands - Array of energy bands in MeV
 * @param {Number} lowerBound - Lower bound of energy range in MeV
 * @param {Number} upperBound - Upper bound of energy range in MeV
 * @returns {Number} - Proton flux in cm-2 sr-1 s-1
 */
const calculateProtonFlux = (diffFluxMatrix, energyBands, lowerBound) => {
    let totalFlux = 0;
    for (let sensorIndex = 0; sensorIndex < diffFluxMatrix.length; sensorIndex++) {
        for (let energyIndex = 0; energyIndex < diffFluxMatrix[sensorIndex].length; energyIndex++) {
            const energyBand = energyBands[energyIndex];
            if (lowerBound > energyBand.upper) continue;
            const binWidth = (energyBand.upper - energyBand.lower)*1000; // keV
            totalFlux += diffFluxMatrix[sensorIndex][energyIndex] * binWidth;
        }
    }

    return totalFlux;
};

const parseHeader = (spaceData) => {
    return parseBitFields(spaceData, genericPayloadFields);
};

export const parseGenericData = (spaceData) => {
    const length = spaceData.length;
    const header = parseHeader(spaceData.slice(0, GENERIC_HEADER_LEN));
    const headerBits = spaceData.slice(0, GENERIC_HEADER_LEN)
    const data = spaceData.slice(header.length);
    return {
        header,
        headerBits,
        data,
        length,
    };
};

export const getXRay = (xRaySpacePacket) => {
    const parsedData = parseByteFields(xRaySpacePacket.data, xRayDataFields, true);
    // TODO: check quality flags
    const times = parsedData.sps_obs_time;
    return {
        date: secEpochToDate(xRaySpacePacket.header.secEpoch+xRaySpacePacket.header.microSec*1e-6),
        value: parsedData.irradiance_xrsb1,
        data: parsedData,
    };
};

export const getSolarGalacticProton = (sgpPacket) => {
    const parsedData = parseByteFields(
        // sgpPacket.headerBits.slice(sgpPacket.headerBits.length-64)+
        sgpPacket.data, // FIXME: not sure why the data is offset by 64 bits
        solarGalacticProtonDataFields, true,
    );
    // TODO: check quality flags
    const t1DiffFlux = arrayToMatrix(
        parsedData.T1_DifferentialProtonFluxes,
        2,6
    ); // 2 sensors, 6 energy bands
    const t2DiffFlux = arrayToMatrix(
        parsedData.T2_DifferentialProtonFluxes,
        2,2
    ); // 2 sensors, 2 energy bands
    const t3DiffFlux = arrayToMatrix(
        parsedData.T3_DifferentialProtonFluxes,
        2,5
    ); // 2 sensors, 5 energy bands

    const integral500flux = parsedData.T3P11_IntegralProtonFlux.reduce((acc, curr) => acc + curr, 0);; // cm-2 sr-1 s-1

    // Merge the differential proton flux matrices
    function transposeMatrix(matrix) {
        return matrix[0].map((col, i) => matrix.map(row => row[i]));
    }
    const diffFluxMatrix = transposeMatrix([
        [...t1DiffFlux[0], ...t2DiffFlux[0], ...t3DiffFlux[0]],
        [...t1DiffFlux[1], ...t2DiffFlux[1], ...t3DiffFlux[1]],
    ]);
    // const diffFluxMatrix = [...t1DiffFlux, ...t2DiffFlux, ...t3DiffFlux];

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
        diffFluxMatrix, energyBands, 10,
    )+integral500flux;
    const protonFlux50MeV = calculateProtonFlux(
        diffFluxMatrix, energyBands, 50,
    )+integral500flux;
    const protonFlux100MeV = calculateProtonFlux(
        diffFluxMatrix, energyBands, 100,
    )+integral500flux;

    return {
        date: secEpochToDate(
            sgpPacket.header.secEpoch
            +sgpPacket.header.microSec*1e-6
        ),
        sciDate1: secEpochToDate(parsedData.L1a_SciData_TimeStamp[0][0]),
        sciDate2: secEpochToDate(parsedData.L1a_SciData_TimeStamp[0][1]),
        proton10: protonFlux10MeV,
        proton50: protonFlux50MeV,
        proton100: protonFlux100MeV,
        data: parsedData, 
    };
};
