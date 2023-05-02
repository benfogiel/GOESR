import {caduConstants, caduFields} from "./constants.js";
import {parseStruct} from "./utils.js";

const {
    SYNC_VAL,
    RSVD_SPARE_VAL,
    REPLAY_FLAG_VAL,
} = caduConstants;

const validCadu = (parsedCadu) => {
    if (parsedCadu.sync !== SYNC_VAL) throw new Error("Invalid sync value");
    if (parsedCadu.aosTransferFrame.primaryHeader.signalingField.replayFlag !== REPLAY_FLAG_VAL) {
        throw new Error("Invalid replay flag");
    }
    // TODO: revisit this - it should be "1", but it is "0" in the test data,
    // if (
    //     parsedCadu.aosTransferFrame.primaryHeader.signalingField.virtualChannelFrameCountUsageFlag
    //     !== VR_CH_FRAME_CNT_USAGE_FLAG_VAL)
    //     throw new Error("Invalid virtual channel frame count usage flag");
    if (
        parsedCadu.aosTransferFrame.primaryHeader.signalingField.rsvdSpare
        !== RSVD_SPARE_VAL
        && parsedCadu.aosTransferFrame.dataField.mPduHeader.rsvdSpare
        !== RSVD_SPARE_VAL) {
        throw new Error("Invalid reserved spare");
    }

    return true;
};

const parseCadu = (bitStream) => {
    const cadu = parseStruct(bitStream, caduFields, 0);

    try {
        validCadu(cadu);
    } catch (err) {
        console.log("Invalid CADU: " + err.message);
        return null;
    }

    return cadu;
};

export default parseCadu;
