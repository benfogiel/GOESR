import {genericPayloadFields} from "./constants.js";
import {parseBitFields, parseByteFields, secEpochToDate} from "./utils.js";
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

    for (let energyIndex = 0; energyIndex < diffFluxMatrix.length; energyIndex++) {
        const energyBand = energyBands[energyIndex];
        if (energyBand.lower < lowerBound) continue;
        for (let sensorIndex = 0; sensorIndex < diffFluxMatrix[energyIndex].length; sensorIndex++) {
            const binWidth = (energyBand.upper - energyBand.lower)*1000; // keV
            totalFlux += diffFluxMatrix[energyIndex][sensorIndex] * binWidth;
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
    const data = spaceData.slice(header.length);
    return {
        header,
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
    };
};

export const getSolarGalacticProton = (solarGalacticProtonPacket) => {
    const parsedData = parseByteFields(
        solarGalacticProtonPacket.data, solarGalacticProtonDataFields, true,
    );
    // TODO: check quality flags
    const t1DiffFlux = parsedData.T1_DifferentialProtonFluxes; // 2by6 matrix, 2 sensors, 6 energy bands
    const t2DiffFlux = parsedData.T2_DifferentialProtonFluxes; // 2by2 matrix, 2 sensors, 2 energy bands
    const t3DiffFlux = parsedData.T3_DifferentialProtonFluxes; // 2by5 matrix, 2 sensors, 5 energy bands

    const integral500flux = parsedData.T3P11_IntegralProtonFlux; // cm-2 sr-1 s-1

    // Merge the differential proton flux matrices
    // const diffFluxMatrix = [
    //     t1DiffFlux[0].concat(t2DiffFlux[0]).concat(t3DiffFlux[0]),
    //     t1DiffFlux[1].concat(t2DiffFlux[1]).concat(t3DiffFlux[1]),
    // ];
    const diffFluxMatrix = [
        ...t1DiffFlux, ...t2DiffFlux, ...t3DiffFlux,
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
            solarGalacticProtonPacket.header.secEpoch
            +solarGalacticProtonPacket.header.microSec*1e-6
        ),
        sciDate1: secEpochToDate(parsedData.L1a_SciData_TimeStamp[0][0]),
        sciDate2: secEpochToDate(parsedData.L1a_SciData_TimeStamp[0][1]),
        proton10: protonFlux10MeV,
        proton50: protonFlux50MeV,
        proton100: protonFlux100MeV,
    };
};
