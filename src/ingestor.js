import assert from "assert";

import {PacketPriorityQueue} from "./utils.js";
import parseCadu from "./caduParser.js";
import {parseSpacePacketHeaderSlice, appendRemBits} from "./spacePacketParser.js";
import {
    parseGenericData,
    getSolarGalacticProton,
    getXRay,
} from "./genericData.js";
import {caduConstants} from "./constants.js";
import {genericDataConstants} from "./constants.js";
import {spacePacketConstants} from "./constants.js";
import {apids} from "./constants.js";

const {
    RHCP_VAL,
    SP_POINTER_OVERFLOW_VAL,
    VR_CH_FRAME_CNT_MAX,
} = caduConstants;
const {
    GENERIC_PACKET_TYPE,
    SEQUENCE_COUNT_MAX,
} = spacePacketConstants;
const {
    X_RAY_DATA_APID,
    SOLAR_GALACTIC_PROTON_APID,
} = apids;

const APIDS = [
    X_RAY_DATA_APID,
    SOLAR_GALACTIC_PROTON_APID,
];

export default class SpacePacketIngestor {
    constructor() {
        this.xRay = {
            segmented: new PacketPriorityQueue(
                SEQUENCE_COUNT_MAX+1, genericDataConstants.PACKET_QUEUE_CAPACITY,
            ),
            complete: [],
        };
        this.solarGalacticProton = {
            segmented: new PacketPriorityQueue(
                SEQUENCE_COUNT_MAX+1, genericDataConstants.PACKET_QUEUE_CAPACITY,
            ),
            complete: [],
        };
        this.cadus = new PacketPriorityQueue(
            VR_CH_FRAME_CNT_MAX+1, caduConstants.PACKET_QUEUE_CAPACITY,
        );
        this.caduRequests = new PacketPriorityQueue(
            VR_CH_FRAME_CNT_MAX+1, caduConstants.CADU_REQUESTS_CAPACITY,
        );
    }

    emptyComplete() {
        this.xRay.complete = [];
        this.solarGalacticProton.complete = [];
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

        const caduFrame = tfph.virtualChannelFrameCount;
        this.cadus.enqueue(cadu, caduFrame);

        // fulfill CADU requests
        // run each cadu request through addRemBits
        for (let i = 0; i < this.caduRequests.queue.length; i++) {
            const caduRequest = this.caduRequests.queue[i];
            this.addRemBits(caduRequest.packet, caduRequest.seqNum);
        }


        const mpduHeader = cadu.aosTransferFrame.dataField.mPduHeader;
        if (mpduHeader.firstHeaderPointer !== SP_POINTER_OVERFLOW_VAL) {
            // there exists a space header within the packet data field
            const mpduPacketZone = cadu.aosTransferFrame.dataField.mPduPacketZone;
            const spaceHeaderOffset = parseInt(mpduHeader.firstHeaderPointer, 2) * 8; // number of offset bits
            const spacePacketSlice = parseSpacePacketHeaderSlice(
                mpduPacketZone.slice(spaceHeaderOffset),
            );
            if (spacePacketSlice !== null && spacePacketFilter(spacePacketSlice)) {
                // this is a space packet that we're interested in
                if (spacePacketSlice.remBits > 0) {
                    // this space packet is split across multiple CADUs
                    const caduRequestFrame = (tfph.virtualChannelFrameCount + 1)
                        % (VR_CH_FRAME_CNT_MAX+1);
                    this.caduRequests.enqueue(spacePacketSlice, caduRequestFrame);
                    this.addRemBits(spacePacketSlice, caduRequestFrame);
                    return;
                }
                this.recordSpacePacket(spacePacketSlice);
            }
        }
    }

    addRemBits(spacePacketSlice, caduRequestFrame) {
        // spacePacketSlice must already be in the caduRequests queue
        // look at the next cadu for the remainder of the space packet
        const nextCadu = this.cadus.getPacket(caduRequestFrame)?.packet;
        if (nextCadu) {
            const nextMpduPacketZone = nextCadu.aosTransferFrame.dataField.mPduPacketZone;
            const remDataSlice = nextMpduPacketZone.slice(0, spacePacketSlice.remBits);
            if (remDataSlice !== null && remDataSlice.length > 0
                && (
                    nextCadu.aosTransferFrame.dataField.mPduHeader.firstHeaderPointer
                        === SP_POINTER_OVERFLOW_VAL
                    || parseInt(
                        nextCadu.aosTransferFrame.dataField.mPduHeader.firstHeaderPointer, 2,
                    ) === parseInt(spacePacketSlice.remBits/8)
                )
            ) {
                appendRemBits(spacePacketSlice, remDataSlice);
                if (spacePacketSlice.remBits > 0) {
                    // we have more bits to append
                    // remove from requests queue and add back with new cadu request frame
                    this.caduRequests.dequeue(caduRequestFrame);
                    const nextCaduRequestFrame = (caduRequestFrame + 1) % (VR_CH_FRAME_CNT_MAX+1);
                    this.caduRequests.enqueue(spacePacketSlice, nextCaduRequestFrame);
                    this.addRemBits(spacePacketSlice, nextCaduRequestFrame);
                    return;
                }
                // space packet is complete
                // remove from requests queue
                this.caduRequests.dequeue(caduRequestFrame);
                this.recordSpacePacket(spacePacketSlice);
            } else {
                throw Error("Issue occurred while appending remaining bits");
            }
        } else {
            // we're missing the next cadu, keep the space packet in the requests queue
            return;
        }
    }

    assembleSpacePacket(segments, storage) {
        // remove each segment from the segmented storage
        segments.forEach((segment) => {
            assert(segment.remBits === 0, "Segment still has remaining bits");
            storage.segmented.dequeue(segment.primaryHeader.sequenceCount);
        });
        const spacePacket = parseGenericData(segments.reduce((acc, segment) => {
            return acc + segment.spaceData;
        }, ""));
        spacePacket.apid = segments[0].primaryHeader.apid;
        let processedData;
        switch (spacePacket.apid) {
            case X_RAY_DATA_APID:
                processedData = getXRay(spacePacket);
                break;
            case SOLAR_GALACTIC_PROTON_APID:
                processedData = getSolarGalacticProton(spacePacket);
                break;
            default:
                throw new Error("APID is not valid");
        }
        if (processedData !== null) {
            storage.complete.push(processedData);
        }
    }

    recordSpacePacket(spacePacket) {
        let storage;
        switch (spacePacket.primaryHeader.apid) {
            case X_RAY_DATA_APID:
                storage = this.xRay;
                break;
            case SOLAR_GALACTIC_PROTON_APID:
                storage = this.solarGalacticProton;
                break;
            default:
                throw new Error("APID is not valid");
        }
        if (spacePacket.primaryHeader.sequenceFlag === "11") {
            // space packet is unsegmented
            return this.assembleSpacePacket([spacePacket], storage);
        } else if (spacePacket.primaryHeader.sequenceFlag === "01") {
            // this is the first segment of a segmented space packet
            storage.segmented.enqueue(spacePacket, spacePacket.primaryHeader.sequenceCount);
            const nextSegments = getNextSegments(spacePacket, storage);
            if (nextSegments !== null) {
                // we have the last segment, we can assemble the space packet
                return this.assembleSpacePacket([spacePacket, ...nextSegments], storage);
            }
        } else if (spacePacket.primaryHeader.sequenceFlag === "10") {
            // this is the last segment of a segmented space packet
            storage.segmented.enqueue(spacePacket, spacePacket.primaryHeader.sequenceCount);
            const previousSegments = getPreviousSegments(spacePacket, storage);
            if (previousSegments !== null) {
                // we have the first segment, we can assemble the space packet
                return this.assembleSpacePacket([...previousSegments, spacePacket], storage);
            }
        } else if (spacePacket.primaryHeader.sequenceFlag === "00") {
            // this is a middle segment of a segmented space packet
            storage.segmented.enqueue(spacePacket, spacePacket.primaryHeader.sequenceCount);
            const prevSegments = getPreviousSegments(spacePacket, storage);
            const nextSegments = getNextSegments(spacePacket, storage);
            if (prevSegments !== null && nextSegments !== null) {
                // we have both the first and last segments, we can assemble the space packet
                return this.assembleSpacePacket(
                    [...prevSegments, spacePacket, ...nextSegments], storage);
            }
        } else {
            throw new Error("Sequence flag is not valid");
        }
    }
}

const getNextSegments = (startingSegment, storage) => {
    // find the last segment of the space packet
    // startingSegment cannot be the last segment
    assert(startingSegment.primaryHeader.sequenceFlag !== "10",
        "startingSegment cannot be the last segment");
    let nextPacket = storage.segmented.getPacket(
        (startingSegment.primaryHeader.sequenceCount + 1) % (SEQUENCE_COUNT_MAX + 1),
    )?.packet;
    const segments = [];
    while (nextPacket) {
        segments.push(nextPacket);
        if (nextPacket.primaryHeader.sequenceFlag === "10") {
            // this is the last segment
            return segments;
        }
        nextPacket = storage.segmented.getPacket(
            (nextPacket.primaryHeader.sequenceCount + 1) % (SEQUENCE_COUNT_MAX + 1),
        )?.packet;
    }
    return null;
};

const getPreviousSegments = (startingSegment, storage) => {
    // find the first segment of the space packet
    // startingSegment cannot be the first segment
    assert(startingSegment.primaryHeader.sequenceFlag !== "01",
        "startingSegment cannot be the first segment");
    let prevPacket = storage.segmented.getPacket(
        (startingSegment.primaryHeader.sequenceCount - 1) % (SEQUENCE_COUNT_MAX + 1),
    )?.packet;
    const segments = [];
    while (prevPacket) {
        segments.unshift(prevPacket);
        if (prevPacket.primaryHeader.sequenceFlag === "01") {
            // this is the first segment
            return segments;
        }
        prevPacket = storage.segmented.getPacket(
            (prevPacket.primaryHeader.sequenceCount - 1) % (SEQUENCE_COUNT_MAX + 1),
        )?.packet;
    }
    return null;
};

const hexToBin = (hexArray) => {
    let binaryString = "";

    for (let i = 0; i < hexArray.length; i++) {
        let binary = parseInt(hexArray[i], 16).toString(2);
        binary = binary.padStart(8, "0");
        binaryString += binary;
    }

    return binaryString;
};

const spacePacketFilter = (spacePacketHeaderSlice) => {
    if (!APIDS.includes(spacePacketHeaderSlice.primaryHeader.apid)) return false;
    // additional checks
    if (spacePacketHeaderSlice.secondaryHeader.grbPayloadVariant !== GENERIC_PACKET_TYPE) {
        throw new Error("Space Packet type is not 0 (Generic Packet)");
    }
    return true;
};
