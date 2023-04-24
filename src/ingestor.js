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
    SP_POINTER_OVERFLOW_VAL,
    SEQUENCE_COUNT_MAX,
    CADU_FRAME_COUNT_MAX,
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

class SpacePackets {
    constructor() {
        this.xRay = {
            segmented: {},
            complete: []
        };
        this.protonLow = {
            segmented: {},
            complete: []
        };
        this.protonMedHi = {
            segmented: {},
            complete: []
        };
        this.cadus = {};
    }

    assembleSpacePacket(segments, storage) {
        // remove each segment from the segmented storage
        segments.forEach(segment => {
            delete storage.segmented[segment.primaryHeader.sequenceCount];
        });
        const spacePacket = {
            primaryHeader: segments[0].primaryHeader,
            secondaryHeader: segments[0].secondaryHeader,
            spaceData: segments.reduce((acc, segment) => {
                return acc + segment.spaceData;
            }, ""),
        }
        spacePacket.crc = spacePacket.spaceData.slice(spacePacket.spaceData.length - CRC_LEN, spacePacket.spaceData.length);
        spacePacket.spaceData = spacePacket.spaceData.slice(0, spacePacket.spaceData.length - CRC_LEN);
        spacePacket.spaceData = parseGenericData(spacePacket.spaceData);
        switch (spacePacket.primaryHeader.apid) {
            case X_RAY_DATA_APID:
                spacePacket.spaceData.data = parseXRay(spacePacket.spaceData.data);
                break;
            case PROTON_LOW_DATA_APID:
                spacePacket.spaceData.data = parseLowProton(spacePacket.spaceData.data);
                break;
            case PROTON_MED_HI_DATA_APID:
                spacePacket.spaceData.data = parseMidHiProton(spacePacket.spaceData.data);
                break;
            default:
                throw new Error("APID is not valid");
        }
        return spacePacket;
    }

    recordSpacePacket(spacePacket) {
        let storage;
        switch (spacePacket.primaryHeader.apid) {
            case X_RAY_DATA_APID:
                storage = this.xRay
                break;
            case PROTON_LOW_DATA_APID:
                storage = this.protonLow
                break;
            case PROTON_MED_HI_DATA_APID:
                storage = this.protonMedHi
                break;
            default:
                throw new Error("APID is not valid");
        }
        const getProceedingSegments = (startingSegment) => {
            // find the last segment of the space packet
            let nextSeqCount = startingSegment.primaryHeader.sequenceCount;
            let segments = [];
            while (storage.segmented[nextSeqCount]) {
                if (storage.segmented[nextSeqCount].primaryHeader.sequenceFlag === "10") {
                    // this is the last segment
                    return segments;
                }
                segments.push(storage.segmented[nextSeqCount]);
                nextSeqCount = (nextSeqCount + 1) % (SEQUENCE_COUNT_MAX + 1);
            }
            return null;
        }
        const getPreviousSegments = (startingSegment) => {
            // find the first segment of the space packet
            let prevSeqCount = startingSegment.primaryHeader.sequenceCount;
            let segments = [];
            while (storage.segmented[prevSeqCount]) {
                if (storage.segmented[prevSeqCount].primaryHeader.sequenceFlag === "01") {
                    // this is the first segment
                    return segments;
                }
                segments.unshift(storage.segmented[prevSeqCount]);
                prevSeqCount = (prevSeqCount - 1) % (SEQUENCE_COUNT_MAX + 1);
            }
            return null;
        }    
        if (spacePacket.primaryHeader.sequenceFlag === "11") {
            // space packet is unsegmented
            storage.complete.push(this.assembleSpacePacket([spacePacket], storage));
        } else if (spacePacket.primaryHeader.sequenceFlag === "01") {
            // this is the first segment of a segmented space packet
            storage.segmented[spacePacket.primaryHeader.sequenceCount] = spacePacket;
            const proceedingSegments = getProceedingSegments(spacePacket);
            if (proceedingSegments !== null) {
                // we have the last segment, we can assemble the space packet
                return storage.complete.push(this.assembleSpacePacket([spacePacket,...proceedingSegments], storage));
            }
        } else if (spacePacket.primaryHeader.sequenceFlag === "10") {
            // this is the last segment of a segmented space packet
            storage.segmented[spacePacket.primaryHeader.sequenceCount] = spacePacket;
            const previousSegments = getPreviousSegments(spacePacket);
            if (previousSegments !== null) {
                // we have the first segment, we can assemble the space packet
                return storage.complete.push(this.assembleSpacePacket([...previousSegments, spacePacket], storage));
            }
        } else if (spacePacket.primaryHeader.sequenceFlag === "00") {
            // this is a middle segment of a segmented space packet
            storage.segmented[spacePacket.primaryHeader.sequenceCount] = spacePacket;
            const prevSegments = getPreviousSegments(spacePacket);
            const nextSegments = getProceedingSegments(spacePacket);
            if (prevSegments !== null && nextSegments !== null) {
                // we have both the first and last segments, we can assemble the space packet
                return storage.complete.push(this.assembleSpacePacket([...prevSegments, spacePacket,...nextSegments], storage));
            }
        } else {
            throw new Error("Sequence flag is not valid");
        }
    }

    recordCadus(hexPackets) {
        for (let i = 0; i < hexPackets.length; i++) {
            const bitStreamBin = hexToBin(hexPackets[i]);
            const cadu = parseCadu(bitStreamBin);
            if (!cadu) {
                // invalid cadu
                return null;
            }
            const tfph = cadu.aosTransferFrame.primaryHeader;
            if (tfph.virtualChannelId !== RHCP_VAL) {
                // we're only interested in RHCP
                return null;
            }

            const caduFrame = parseInt(tfph.virtualChannelFrameCount, 2);
            this.cadus[caduFrame] = cadu;
        }
    }
    
    processPacket(hexPacket) {
        // convert hex string to binary string
        const bitStreamBin = hexToBin(hexPacket);
        const cadu = parseCadu(bitStreamBin);
        if (!cadu) {
            // invalid cadu
            return null;
        }
        const tfph = cadu.aosTransferFrame.primaryHeader;
        if (tfph.virtualChannelId !== RHCP_VAL) {
            // we're only interested in RHCP
            return null;
        }

        const mpduHeader = cadu.aosTransferFrame.dataField.mPduHeader;
        if (mpduHeader.firstHeaderPointer !== SP_POINTER_OVERFLOW_VAL) {
            // there exists a space header within the packet data field
            const mpduPacketZone = cadu.aosTransferFrame.dataField.mPduPacketZone;
            const spaceHeaderOffset = parseInt(mpduHeader.firstHeaderPointer, 2) * 8; // number of offset bits
            const spacePacketSlice = parseSpacePacketHeaderSlice(mpduPacketZone.slice(spaceHeaderOffset, mpduPacketZone.length));
            if (spacePacketSlice !== null && spacePacketFilter(spacePacketSlice)) {
                // this is a space packet that we're interested in
                if (spacePacketSlice.remBits !== 0) {
                    // look at the next cadu for the remainder of the space packet
                    const nextCadu = this.cadus[(parseInt(tfph.virtualChannelFrameCount, 2) + 1) % CADU_FRAME_COUNT_MAX+1];
                    if (nextCadu) {
                        const nextMpduPacketZone = nextCadu.aosTransferFrame.dataField.mPduPacketZone;
                        const nextSpacePacketSlice = parseSpacePacketDataSlice(nextMpduPacketZone.slice(0, spacePacketSlice.remBits));
                        if (nextSpacePacketSlice !== null) {
                            spacePacketSlice.spaceData.data = spacePacketSlice.spaceData.data.concat(nextSpacePacketSlice.spaceData.data);
                        }
                    }
                }
                this.recordSpacePacket(spacePacketSlice);
            }
        }
    }
}

module.exports = {
    SpacePackets
}