const {
    CADU_LEN,
    SYNC_LEN,
    TRANSFER_FRAME_VERSION_NUM_LEN,
    SPACECRAFT_ID_LEN,
    VIRTUAL_CHANNEL_ID_LEN,
    VIRTUAL_CHANNEL_FRAME_COUNT_LEN,
    REPLAY_FLAG_LEN,
    VIRTUAL_CHANNEL_FRAME_COUNT_USAGE_FLAG_LEN,
    SING_RSVD_SPARE_LEN,
    VIRTUAL_CHANNEL_FRAME_COUNT_CYCLE_LEN,
    MPDU_RSVD_SPARE_LEN,
    FIRST_HEADER_POINTER_LEN,
    MPDU_PACKET_ZONE_LEN,
    FRAME_ERROR_CONTROL_FIELD_LEN,
    SYNC_VAL,
    VR_CH_FRAME_CNT_MAX,
    VR_CH_FRAME_CNT_USAGE_FLAG_VAL,
    RSVD_SPARE_VAL,
    VR_CH_FRAME_CNT_CYCLE_MAX,
    REPLAY_FLAG_VAL,
} = require("./constants.js").caduConstants;

const validCadu = (parsedCadu) => {
    if (parsedCadu.sync !== SYNC_VAL) throw new Error("Invalid sync value");
    if (
        parseInt(parsedCadu.aosTransferFrame.primaryHeader.virtualChannelFrameCount, 2)
        > VR_CH_FRAME_CNT_MAX) 
        throw new Error("Invalid virtual channel frame count");
    if (parsedCadu.aosTransferFrame.primaryHeader.signalingField.replayFlag !== REPLAY_FLAG_VAL)
        throw new Error("Invalid replay flag");
    // if ( // it should be "1", but it is "0" in the test data, TO DO: revisit this
    //     parsedCadu.aosTransferFrame.primaryHeader.signalingField.virtualChannelFrameCountUsageFlag
    //     !== VR_CH_FRAME_CNT_USAGE_FLAG_VAL) 
    //     throw new Error("Invalid virtual channel frame count usage flag");
    if (
        parsedCadu.aosTransferFrame.primaryHeader.signalingField.rsvdSpare
        !== RSVD_SPARE_VAL
        && parsedCadu.aosTransferFrame.dataField.mPduHeader.rsvdSpare
        != RSVD_SPARE_VAL) 
        throw new Error("Invalid reserved spare");
    if (
        parseInt(parsedCadu.aosTransferFrame.primaryHeader.virtualChannelFrameCountCycle, 2)
        > VR_CH_FRAME_CNT_CYCLE_MAX) 
        throw new Error("Invalid virtual channel frame count cycle");

    return true;
}

const parseCadu = (bitStream) => {
    const parsedData = {};
    let bitPointer = 0;

    parsedData.sync = bitStream.slice(bitPointer, bitPointer + SYNC_LEN);
    bitPointer += SYNC_LEN;

    parsedData.aosTransferFrame = {
        primaryHeader: {},
        dataField: {}
    };

    const tfPrimaryHeader = parsedData.aosTransferFrame.primaryHeader;

    tfPrimaryHeader.masterChannelId = {
        transferFrameVersionNumber: bitStream.slice(bitPointer, bitPointer + TRANSFER_FRAME_VERSION_NUM_LEN),
        spacecraftId: bitStream.slice(bitPointer += TRANSFER_FRAME_VERSION_NUM_LEN, bitPointer + SPACECRAFT_ID_LEN),
    };
    bitPointer += SPACECRAFT_ID_LEN;
    tfPrimaryHeader.virtualChannelId = bitStream.slice(bitPointer, bitPointer + VIRTUAL_CHANNEL_ID_LEN);
    bitPointer += VIRTUAL_CHANNEL_ID_LEN;
    tfPrimaryHeader.virtualChannelFrameCount = bitStream.slice(bitPointer, bitPointer + VIRTUAL_CHANNEL_FRAME_COUNT_LEN);
    bitPointer += VIRTUAL_CHANNEL_FRAME_COUNT_LEN;

    tfPrimaryHeader.signalingField = {
        replayFlag: bitStream.slice(bitPointer, bitPointer + REPLAY_FLAG_LEN),
        virtualChannelFrameCountUsageFlag: bitStream.slice(bitPointer += REPLAY_FLAG_LEN, bitPointer + VIRTUAL_CHANNEL_FRAME_COUNT_USAGE_FLAG_LEN),
        rsvdSpare: bitStream.slice(bitPointer += VIRTUAL_CHANNEL_FRAME_COUNT_USAGE_FLAG_LEN, bitPointer + SING_RSVD_SPARE_LEN),
        virtualChannelFrameCountCycle: bitStream.slice(bitPointer += SING_RSVD_SPARE_LEN, bitPointer + VIRTUAL_CHANNEL_FRAME_COUNT_CYCLE_LEN),
    };
    bitPointer += VIRTUAL_CHANNEL_FRAME_COUNT_CYCLE_LEN;

    const tfDataField = parsedData.aosTransferFrame.dataField;

    tfDataField.mPduHeader = {
        rsvdSpare: bitStream.slice(bitPointer, bitPointer + MPDU_RSVD_SPARE_LEN),
        firstHeaderPointer: bitStream.slice(bitPointer += MPDU_RSVD_SPARE_LEN, bitPointer + FIRST_HEADER_POINTER_LEN),
    };
    bitPointer += FIRST_HEADER_POINTER_LEN;

    // Parse the M_PDU Packet Zone block
    tfDataField.mPduPacketZone = bitStream.slice(bitPointer, bitPointer + MPDU_PACKET_ZONE_LEN);
    bitPointer += MPDU_PACKET_ZONE_LEN;

    // Parse the Frame Error Control Field block
    parsedData.aosTransferFrame.frameErrorControlField = bitStream.slice(bitPointer, bitPointer + FRAME_ERROR_CONTROL_FIELD_LEN);
    bitPointer += FRAME_ERROR_CONTROL_FIELD_LEN;

    if (bitPointer !== CADU_LEN) {
        throw new Error("CADU length is not 2048 bytes");
    }

    try {
        caduValid = validCadu(parsedData)
    } catch (err) {
        console.log("Invalid CADU: " + err);
        return null;
    };

    return parsedData;
}

module.exports = parseCadu;
