import {genericPayloadFields} from "./constants.js";
import {parseBitFields, parseByteFields, secEpochToDate} from "./utils.js";
import {genericDataConstants} from "./constants.js";
import {
    xRayDataFields,
    solarGalacticProtonDataFields,
} from "./constants.js";

const {GENERIC_HEADER_LEN} = genericDataConstants;

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

/** 
 * Returns xRay irradiance in W/m^2 of wavelength 0.1-0.8 nm
 * @param {Object} xRaySpacePacket - xRay space packet
 * @return {Object} - irradiance_xrsb data
 */
export const getXRay = (xRaySpacePacket) => {
    const parsedData = parseByteFields(xRaySpacePacket.data, xRayDataFields, true);
    let irradiance_xrsb = parsedData.primary_xrsb === 0 ? parsedData.irradiance_xrsb1 : parsedData.irradiance_xrsb2;

    return {
        packageTimeStamp: secEpochToDate(xRaySpacePacket.header.secEpoch+xRaySpacePacket.header.microSec*1e-6),
        time: secEpochToDate(parsedData.time),
        irradiance_xrsb: irradiance_xrsb,
        invalid_flags: parsedData.invalid_flags,
        quality_flags: parsedData.quality_flags,
    };
};

/** 
 * Returns solar galactic proton data within each energy band
 * @param {Object} sgpPacket - solar galactic proton data packet
 * @return {Object} - solar galactic proton data
 */
export const getSolarGalacticProton = (sgpPacket) => {

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

    const parsedData = parseByteFields(
        // sgpPacket.headerBits.slice(sgpPacket.headerBits.length-64)+
        sgpPacket.data, // FIXME: not sure why the data is offset by 64 bits
        solarGalacticProtonDataFields, true,
    );

    const diffProtonFluxes = parsedData.T1_DifferentialProtonFluxes.concat(
        parsedData.T2_DifferentialProtonFluxes,
        parsedData.T3_DifferentialProtonFluxes,
    );
    const diffProtonFluxUncs = parsedData.T1_DifferentialProtonFluxUncertainties.concat(
        parsedData.T2_DifferentialProtonFluxUncertainties,
        parsedData.T3_DifferentialProtonFluxUncertainties,
    );
    const qualityFlags = parsedData.T1_DifferentialProtonFluxDQFs.concat(
        parsedData.T2_DifferentialProtonFluxDQFs,
        parsedData.T3_DifferentialProtonFluxDQFs,
    );

    const integral500Fluxes = parsedData.T3P11_IntegralProtonFlux; // cm-2 sr-1 s-1
    const integral500FluxUncs = parsedData.T3_DifferentialProtonFluxUncertainties; // cm-2 sr-1 s-1
    const integral500QualityFlags = parsedData.T3P11_IntegralProtonFluxDQFs;

    const protonData = [];
    let energyIndex = 0;
    for (let i = 0; i < diffProtonFluxes.length; i++) {
        const energyBand = energyBands[energyIndex];
        const binWidth = (energyBand.upper - energyBand.lower)*1000; // keV
        if ( (i+1) % 2 === 0 ) energyIndex++;
        protonData.push({
            energyBand: energyBand,
            sensor: ((i+1) % 2)+1,
            flux: diffProtonFluxes[i] * binWidth,
            fluxUnc: diffProtonFluxUncs[i] * binWidth,
            qualityFlag: qualityFlags[i],
        });
    }
    // add the 500 integral fluxes
    for (let i = 0; i < integral500Fluxes.length; i++) {
        protonData.push({
            energyBand: {lower: 500, upper: Infinity},
            sensor: i+1,
            flux: integral500Fluxes[i],
            fluxUnc: integral500FluxUncs[i],
            qualityFlag: integral500QualityFlags[i],
        });
    }

    return {
        packageTimeStamp: secEpochToDate(
            sgpPacket.header.secEpoch
            + sgpPacket.header.microSec*1e-6
        ),
        sciSen1TimeStamp: secEpochToDate(parsedData.L1a_SciData_TimeStamp[0]),
        sciSen2TimeStamp: secEpochToDate(parsedData.L1a_SciData_TimeStamp[1]),
        protonData: protonData
    };
};
