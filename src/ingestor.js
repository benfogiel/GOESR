const crc32 = require('crc/crc32');
const parseCadu = require("./caduParser");
const {parseSpacePacketHeaderSlice} = require("./spacePacketParser");
const {
    parseGenericData,
    parseMidHiProton,
    parseLowProton,
    parseXRay,
} = require("./genericDataParser");
const {
    SYNC_VAL,
    RHCP_VAL,
    SP_POINTER_OVERFLOW_VAL
} = require("./constants.js").caduConstants;
const {CRC_LEN, GENERIC_PACKET_TYPE} = require("./constants.js").spacePacketConstants;
const {
    X_RAY_DATA_APID,
    PROTON_LOW_DATA_APID,
    PROTON_MED_HI_DATA_APID
} = require("./constants.js").apids;

function hexToBin(hexArray) {
    let binaryString = '';
  
    for (let i = 0; i < hexArray.length; i++) {
      let binary = parseInt(hexArray[i], 16).toString(2);
      binary = binary.padStart(8, '0');
      binaryString += binary;
    }
  
    return binaryString;
}

const spacePacketFilter = (spacePacketHeaderSlice) => {
    const accept = spacePacketHeaderSlice.primaryHeader.apid === X_RAY_DATA_APID
        || spacePacketHeaderSlice.primaryHeader.apid === PROTON_LOW_DATA_APID
        || spacePacketHeaderSlice.primaryHeader.apid === PROTON_MED_HI_DATA_APID;
    if (!accept) return false;
    // additional checks
    if (spacePacketHeaderSlice.secondaryHeader.grbPayloadVariant !== GENERIC_PACKET_TYPE) {
        throw new Error('Space Packet type is not 0 (Generic Packet)');
    }
    return accept;
}

function compilePackets(hexPackets) {
    const caduPackets = {};
    const headerPackets = [];

    for (const bitStream of hexPackets) {
        // convert hex string to binary string
        const bitStreamBin = hexToBin(bitStream);
        const cadu = parseCadu(bitStreamBin);
        if (!cadu) {
            // invalid cadu
            continue;
        }

        const tfph = cadu.aosTransferFrame.primaryHeader;
        if (tfph.virtualChannelId !== RHCP_VAL) {
            // we're only interested in RHCP
            continue;
        }

        const caduFrame = parseInt(tfph.virtualChannelFrameCount, 2);
        caduPackets[caduFrame] = cadu;

        const mpduHeader = cadu.aosTransferFrame.dataField.mPduHeader;
        if (mpduHeader.firstHeaderPointer !== SP_POINTER_OVERFLOW_VAL) {
            // there exists a space header within the packet data field
            const mpduPacketZone = cadu.aosTransferFrame.dataField.mPduPacketZone;
            const spaceHeaderOffset = parseInt(mpduHeader.firstHeaderPointer, 2) * 8; // number of offset bits
            const spacePacketHeaderSlice = parseSpacePacketHeaderSlice(mpduPacketZone.slice(spaceHeaderOffset, mpduPacketZone.length));
            if (spacePacketFilter(spacePacketHeaderSlice)) {
                headerPackets.push({
                    caduFrame: caduFrame,
                    spacePacketHeaderSlice: spacePacketHeaderSlice
                });
            }
        }
    }
    return {
        caduPackets,
        headerPackets
    };
}

const checkSum = (spacePacket) => {
    // compile all the bits into a single string
    let bitString = "";
    // iterate through the primary header
    for (const field in spacePacket.primaryHeader) {
        bitString += spacePacket.primaryHeader[field];
    }
    // iterate through the secondary header
    for (const field in spacePacket.secondaryHeader) {
        bitString += spacePacket.secondaryHeader[field];
    }
    for (const field in spacePacket.spaceData.header) {
        bitString += spacePacket.secondaryHeader[field];
    }
    bitString += spacePacket.spaceData.data;
    const byteArray = new Int8Array(Buffer.from(bitString, 'binary'));
    const crc = crc32(byteArray);
    return crc === parseInt(spacePacket.crc,2);
}

const assembleSpacePackets = (hexPackets) => {
    const {caduPackets, headerPackets} = compilePackets(hexPackets);
    const spacePackets = {
        xRay: [],
        protonLow: [],
        protonMedHi: []
    };
    const recordSpacePacket = (spacePacket) => {
        switch (spacePacket.primaryHeader.apid) {
            case X_RAY_DATA_APID:
                try {
                    spacePacket.spaceData.data = parseXRay(spacePacket.spaceData.data);
                    spacePackets.xRay.push(spacePacket);
                } catch (e) {
                    console.log("Was not able to decode xRay data. Error: " + e);
                }
                break;
            case PROTON_LOW_DATA_APID:
                try {
                    spacePacket.spaceData.data = parseLowProton(spacePacket.spaceData.data);
                    spacePackets.protonLow.push(spacePacket);
                } catch (e) {
                    console.log("Was not able to decode Low Proton data. Error: " + e);
                }
                break;
            case PROTON_MED_HI_DATA_APID:
                try {
                    spacePacket.spaceData.data = parseMidHiProton(spacePacket.spaceData.data);
                    spacePackets.protonMedHi.push(spacePacket);
                } catch (e) {
                    console.log("Was not able to decode Low and High Proton data. Error: " + e);
                }
                break;
            default:
                throw new Error("APID is not valid");
        }
    }
    // iterate through the header packets
    for (const headerPacket of headerPackets) {
        let completeSpacePacket;
        const spaceSlice = headerPacket.spacePacketHeaderSlice;
        if (spaceSlice.numRemDataBits === 0) {
            // this is the entire space packet
            completeSpacePacket = spaceSlice;
        } else {
            // space packet is not entirely in the header packet
            // find the next frame count
            let numRemDataBits = spaceSlice.numRemDataBits;
            let spacePacket = spaceSlice;
            let packet = caduPackets[headerPacket.caduFrame];
            while (numRemDataBits > 0) {
                const frameCount = parseInt(packet.aosTransferFrame.primaryHeader.virtualChannelFrameCount, 2);
                const nextFrameNum = (frameCount + 1) % 16777216;
                const cadu = caduPackets[nextFrameNum];
                if (!cadu) {
                    console.log("Next CADU does not exist");
                    break;
                }
                // check that First Header Pointer does not overlap with the previous space packet data
                const headerPointer = cadu.aosTransferFrame.dataField.mPduHeader.firstHeaderPointer;
                if (headerPointer !== SP_POINTER_OVERFLOW_VAL) {
                    const headerPointerOffset = parseInt(headerPointer, 2) * 8;
                    if (headerPointerOffset < numRemDataBits) {
                        console.log("Space packet data overlaps with the next header");
                        break;
                    }
                } else {
                    console.log("There exist two space packet info in the same CADU");
                    break;
                }
                const caduPacketZone = cadu.aosTransferFrame.dataField.mPduPacketZone;
                if (numRemDataBits > caduPacketZone.length) {
                    // we need to get the entire packet zone
                    spacePacket.spaceData = spacePacket.spaceData.concat(caduPacketZone);
                    numRemDataBits -= caduPacketZone.length;
                } else {
                    // we can finish the space packet with this packet
                    spacePacket.spaceData = spacePacket.spaceData.concat(caduPacketZone.slice(0, numRemDataBits));
                    numRemDataBits = 0;
                    break;
                }
                packet = cadu;
            }
            if (numRemDataBits > 0) {
                // we didn't get the entire space packet
                console.log("was not able to get entire space packet");
                continue;
            } else if (numRemDataBits === 0) {
                // we got the entire space packet
                completeSpacePacket = spacePacket;
            }
        }
        // separate the CRC from the the end of the space packet
        completeSpacePacket.crc = completeSpacePacket.spaceData.slice(completeSpacePacket.spaceData.length - CRC_LEN, completeSpacePacket.spaceData.length);
        completeSpacePacket.spaceData = completeSpacePacket.spaceData.slice(0, completeSpacePacket.spaceData.length - CRC_LEN);
        completeSpacePacket.spaceData = parseGenericData(completeSpacePacket.spaceData);
        // check the checksum
        // if (!checkSum(completeSpacePacket)) {
        //     console.log("Checksum is not correct");
        // } else {
        //     // this is generic data, parse the generic data
        //     completeSpacePacket.spaceData = parseGenericData(completeSpacePacket.spaceData);
        //     recordSpacePacket(completeSpacePacket);
        // }
        recordSpacePacket(completeSpacePacket);
    }
    return spacePackets;
}

module.exports = {
    assembleSpacePackets,
    checkSum,
}