const assert = require('assert');

const {PacketPriorityQueue} = require("./utils")
const parseCadu = require("./caduParser");
const {parseSpacePacketHeaderSlice, appendRemBits} = require("./spacePacketParser");
const {
    parseGenericData,
    parseMidHiProton,
    parseLowProton,
    parseXRay,
    parseXRayMeta,
    parseProtonLowMeta,
    parseProtonMedHiMeta,
} = require("./genericDataParser");
const {genericDataConstants} = require("./constants.js");
const {
    RHCP_VAL,
    SP_POINTER_OVERFLOW_VAL,
    VR_CH_FRAME_CNT_MAX,
} = require("./constants.js").caduConstants;
const {
    GENERIC_PACKET_TYPE,
    SEQUENCE_COUNT_MAX
} = require("./constants.js").spacePacketConstants;
const {
    X_RAY_DATA_APID,
    PROTON_LOW_DATA_APID,
    PROTON_MED_HI_DATA_APID,
    X_RAY_META_APID,
    PROTON_LOW_META_APID,
    PROTON_MED_HI_META_APID,
} = require("./constants.js").apids;

const APIDS = [
    X_RAY_DATA_APID,
    PROTON_LOW_DATA_APID,
    PROTON_MED_HI_DATA_APID,
    X_RAY_META_APID,
    PROTON_LOW_META_APID,
    PROTON_MED_HI_META_APID,
]

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
    if (!APIDS.includes(spacePacketHeaderSlice.primaryHeader.apid)) return false;
    // additional checks
    if (spacePacketHeaderSlice.secondaryHeader.grbPayloadVariant !== GENERIC_PACKET_TYPE) {
        throw new Error('Space Packet type is not 0 (Generic Packet)');
    }
    return true;
}

class SpacePacketIngestor {
    
    constructor() {
        this.xRay = {
            segmented: new PacketPriorityQueue(SEQUENCE_COUNT_MAX+1, genericDataConstants.PACKET_QUEUE_CAPACITY),
            complete: []
        };
        this.protonLow = {
            segmented: new PacketPriorityQueue(SEQUENCE_COUNT_MAX+1, genericDataConstants.PACKET_QUEUE_CAPACITY),
            complete: []
        };
        this.protonMedHi = {
            segmented: new PacketPriorityQueue(SEQUENCE_COUNT_MAX+1, genericDataConstants.PACKET_QUEUE_CAPACITY),
            complete: []
        };
        this.protonLowMeta = {
            segmented: new PacketPriorityQueue(SEQUENCE_COUNT_MAX+1, genericDataConstants.PACKET_QUEUE_CAPACITY),
            complete: []
        };
        this.protonMedHiMeta = {
            segmented: new PacketPriorityQueue(SEQUENCE_COUNT_MAX+1, genericDataConstants.PACKET_QUEUE_CAPACITY),
            complete: []
        };
        this.xRayMeta = {
            segmented: new PacketPriorityQueue(SEQUENCE_COUNT_MAX+1, genericDataConstants.PACKET_QUEUE_CAPACITY),
            complete: []
        };
        this.cadus = {};
    }

    recordCadus(hexPackets) {
        for (let i = 0; i < hexPackets.length; i++) {
            const bitStreamBin = hexToBin(hexPackets[i]);
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
                    const nextCadu = this.cadus[(parseInt(tfph.virtualChannelFrameCount, 2) + 1) % (VR_CH_FRAME_CNT_MAX+1)];
                    if (nextCadu) {
                        const nextMpduPacketZone = nextCadu.aosTransferFrame.dataField.mPduPacketZone;
                        const remDataSlice = nextMpduPacketZone.slice(0, spacePacketSlice.remBits);
                        if (remDataSlice !== null && remDataSlice.length > 0 
                            && remDataSlice.length === spacePacketSlice.remBits
                            && (
                                nextCadu.aosTransferFrame.dataField.mPduHeader.firstHeaderPointer === SP_POINTER_OVERFLOW_VAL
                                ||
                                parseInt(nextCadu.aosTransferFrame.dataField.mPduHeader.firstHeaderPointer,2) === parseInt(spacePacketSlice.remBits/8)
                            )
                            ) {
                            appendRemBits(spacePacketSlice, remDataSlice);
                        } else {
                            throw ("Issue occurred while appending remaining bits")
                        }
                    } else {
                        // TODO: handle this case
                        // we're missing the next cadu
                        console.log("Missing next cadu");
                        return null;
                    }
                }
                this.recordSpacePacket(spacePacketSlice);
            }
        }
    }

    assembleSpacePacket(segments, storage) {
        // remove each segment from the segmented storage
        segments.forEach(segment => {
            delete storage.segmented.dequeue[segment.primaryHeader.sequenceCount];
        });
        const spacePacket = {
            primaryHeader: segments[0].primaryHeader,
            secondaryHeader: segments[0].secondaryHeader,
            spaceData: segments.reduce((acc, segment) => {
                return acc + segment.spaceData;
            }, ""),
        }
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
            case X_RAY_META_APID:
                spacePacket.spaceData.data = parseXRayMeta(spacePacket.spaceData.data);
                break;
            case PROTON_LOW_META_APID:
                spacePacket.spaceData.data = parseProtonLowMeta(spacePacket.spaceData.data);
                break;
            case PROTON_MED_HI_META_APID:
                spacePacket.spaceData.data = parseProtonMedHiMeta(spacePacket.spaceData.data);
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
                storage = this.xRay;
                break;
            case PROTON_LOW_DATA_APID:
                storage = this.protonLow;
                break;
            case PROTON_MED_HI_DATA_APID:
                storage = this.protonMedHi
                break;
            case X_RAY_META_APID:
                storage = this.xRayMeta;
                break;
            case PROTON_LOW_META_APID:
                storage = this.protonLowMeta;
                break;
            case PROTON_MED_HI_META_APID:
                storage = this.protonMedHiMeta;
                break;
            default:
                throw new Error("APID is not valid");
        }
        const getNextSegments = (startingSegment) => {
            // find the last segment of the space packet
            // startingSegment cannot be the last segment
            assert(startingSegment.primaryHeader.sequenceFlag !== "10", "startingSegment cannot be the last segment");
            let nextPacket = storage.segmented.getPacket((startingSegment.primaryHeader.sequenceCount + 1) % (SEQUENCE_COUNT_MAX + 1))?.packet;
            let segments = [];
            while (nextPacket) {
                segments.push(nextPacket);
                if (nextPacket.primaryHeader.sequenceFlag === "10") {
                    // this is the last segment
                    return segments;
                }
                nextPacket = storage.segmented.getPacket((nextPacket.primaryHeader.sequenceCount + 1) % (SEQUENCE_COUNT_MAX + 1))?.packet;
            }
            return null;
        }
        const getPreviousSegments = (startingSegment) => {
            // find the first segment of the space packet
            // startingSegment cannot be the first segment
            assert(startingSegment.primaryHeader.sequenceFlag !== "01", "startingSegment cannot be the first segment")
            let prevPacket = storage.segmented.getPacket((startingSegment.primaryHeader.sequenceCount - 1) % (SEQUENCE_COUNT_MAX + 1))?.packet;
            let segments = [];
            while (prevPacket) {
                segments.unshift(prevPacket);
                if (prevPacket.primaryHeader.sequenceFlag === "01") {
                    // this is the first segment
                    return segments;
                }
                prevPacket = storage.segmented.getPacket((prevPacket.primaryHeader.sequenceCount - 1) % (SEQUENCE_COUNT_MAX + 1))?.packet;
            }
            return null;
        }    
        if (spacePacket.primaryHeader.sequenceFlag === "11") {
            // space packet is unsegmented
            storage.complete.push(this.assembleSpacePacket([spacePacket], storage));
        } else if (spacePacket.primaryHeader.sequenceFlag === "01") {
            // this is the first segment of a segmented space packet
            storage.segmented.enqueue(spacePacket, spacePacket.primaryHeader.sequenceCount);
            const nextSegments = getNextSegments(spacePacket);
            if (nextSegments !== null) {
                // we have the last segment, we can assemble the space packet
                return storage.complete.push(this.assembleSpacePacket([spacePacket,...nextSegments], storage));
            }
        } else if (spacePacket.primaryHeader.sequenceFlag === "10") {
            // this is the last segment of a segmented space packet
            storage.segmented.enqueue(spacePacket, spacePacket.primaryHeader.sequenceCount);
            const previousSegments = getPreviousSegments(spacePacket);
            if (previousSegments !== null) {
                // we have the first segment, we can assemble the space packet
                return storage.complete.push(this.assembleSpacePacket([...previousSegments, spacePacket], storage));
            }
        } else if (spacePacket.primaryHeader.sequenceFlag === "00") {
            // this is a middle segment of a segmented space packet
            storage.segmented.enqueue(spacePacket, spacePacket.primaryHeader.sequenceCount);
            const prevSegments = getPreviousSegments(spacePacket);
            const nextSegments = getNextSegments(spacePacket);
            if (prevSegments !== null && nextSegments !== null) {
                // we have both the first and last segments, we can assemble the space packet
                return storage.complete.push(this.assembleSpacePacket([...prevSegments, spacePacket,...nextSegments], storage));
            }
        } else {
            throw new Error("Sequence flag is not valid");
        }
    }
}

module.exports = {
    SpacePacketIngestor
}