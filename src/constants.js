// all constants are defined here

const caduConstants = {
    CADU_LEN: 2048 * 8, // bits
    SYNC_LEN: 4 * 8, // bits
    AOS_TRANSFER_FRAME_LEN: 2044 * 8, // bits
    TRANSFER_FRAME_PRIMARY_HEADER_LEN: 6 * 8, // bits
    MASTER_CHANNEL_ID_LEN: 10, // bits
    TRANSFER_FRAME_VERSION_NUM_LEN: 2, // bits
    SPACECRAFT_ID_LEN: 8, // bits
    VIRTUAL_CHANNEL_ID_LEN: 6, // bits
    VIRTUAL_CHANNEL_FRAME_COUNT_LEN: 24, // bits
    SIGNALLING_FIELD_LEN: 8, // bits
    REPLAY_FLAG_LEN: 1, // bit
    VIRTUAL_CHANNEL_FRAME_COUNT_USAGE_FLAG_LEN: 1, // bit
    SING_RSVD_SPARE_LEN: 2, // bits
    VIRTUAL_CHANNEL_FRAME_COUNT_CYCLE_LEN: 4, // bits
    TRANSFER_FRAME_DATA_FIELD_LEN: 2036 * 8, // bits
    MPDU_HEADER_LEN: 2 * 8, // bits
    MPDU_RSVD_SPARE_LEN: 5, // bits
    FIRST_HEADER_POINTER_LEN: 11, // bits
    MPDU_PACKET_ZONE_LEN: 2034 * 8, // bits
    FRAME_ERROR_CONTROL_FIELD_LEN: 2 * 8, // bits
    SYNC_VAL: "00011010110011111111110000011101",
    RHCP_VAL: "000101",
    SP_POINTER_OVERFLOW_VAL: "11111111111",
    VR_CH_FRAME_CNT_MAX: 16777215,
    REPLAY_FLAG_VAL: "0",
    VR_CH_FRAME_CNT_USAGE_FLAG_VAL: "1",
    RSVD_SPARE_VAL: "00",
    VR_CH_FRAME_CNT_CYCLE_MAX: 15,
};

const spacePacketConstants = {
    M_PDU_PACKET_LEN: 2034*8,
    PRIMARY_HEADER_LEN: 6*8,
    VERSION_NUM_LEN: 3,
    TYPE_LEN: 1,
    SECONDARY_HEADER_FLAG_LEN: 1,
    APID_LEN: 11,
    SEQUENCE_FLAGS_LEN: 2,
    SEQUENCE_COUNT_LEN: 14,
    DATA_LENGTH_LEN: 16,
    SECONDARY_HEADER_LEN: 8*8,
    DAYS_SINCE_EPOCH_LEN: 16,
    MILLISECONDS_OF_DAY_LEN: 32,
    GRB_VERSION_LEN: 5,
    GRB_PAYLOAD_VARIANT_LEN: 5,
    ASSEMBLER_ID_LEN: 2,
    SYSTEM_ENV_LEN: 4,
    USER_DATA_FIELD_MAX_LEN: 16376*8, // 16376 bytes includes the CRC
    CRC_LEN: 4*8,
    VERSION_1_VAL: "000",
    GENERIC_PACKET_TYPE: "00000",
    TYPE_VAL: "0",
    SECONDARY_HEADER_FLAG_VAL: "1",
    SEQUENCE_COUNT_MAX: 16383,
    GRB_VERSION_VAL: "00000",
};

const genericDataConstants = {
    COMPRESS_ALGO_LEN: 8, // bits
    SEC_EPOCH_LEN: 32, // bits
    MICRO_SEC_LEN: 32, // bits
    RESERVED_LEN: 64, // bits
    DATA_UNIT_SEQ_COUNT_LEN: 32, // bits
};

const apids = {
    X_RAY_DATA_APID: "01110000011",
    PROTON_LOW_DATA_APID: "10000010000",
    PROTON_MED_HI_DATA_APID: "10000100001",
}

const midHiProtonDataFields = [
    { name: 'DiffElectronFluxesControl', dataType: 'uint64', size: 16, byteOffset: 0 },
    { name: 'DiffElectronFluxes', dataType: 'float', size: 200, byteOffset: 16 },
    { name: 'IntgElectronFluxesControl', dataType: 'uint64', size: 8, byteOffset: 216 },
    { name: 'IntgElectronFluxes', dataType: 'float', size: 20, byteOffset: 224 },
    { name: 'DiffProtonFluxesControl', dataType: 'uint64', size: 16, byteOffset: 244 },
    { name: 'DiffProtonFluxes', dataType: 'float', size: 220, byteOffset: 260 },
    { name: 'DiffElectronUncertaintiesControl', dataType: 'uint64', size: 16, byteOffset: 480 },
    { name: 'DiffElectronUncertainties', dataType: 'float', size: 200, byteOffset: 496 },
    { name: 'IntgElectronUncertaintiesControl', dataType: 'uint64', size: 8, byteOffset: 696 },
    { name: 'IntgElectronUncertainties', dataType: 'float', size: 20, byteOffset: 704 },
    { name: 'DiffProtonUncertaintiesControl', dataType: 'uint64', size: 16, byteOffset: 724 },
    { name: 'DiffProtonUncertainties', dataType: 'float', size: 220, byteOffset: 740 },
    { name: 'DiffElectronFluxDQFsControl', dataType: 'uint64', size: 16, byteOffset: 960 },
    { name: 'DiffElectronFluxDQFs', dataType: 'uint8', size: 50, byteOffset: 976 },
    { name: 'DiffProtonFluxDQFsControl', dataType: 'uint64', size: 16, byteOffset: 1026 },
    { name: 'DiffProtonFluxDQFs', dataType: 'uint8', size: 55, byteOffset: 1042 },
    { name: 'IntgElectronFluxDQFsControl', dataType: 'uint64', size: 8, byteOffset: 1097 },
    { name: 'IntgElectronFluxDQFs', dataType: 'uint8', size: 5, byteOffset: 1105 },
    { name: 'Dos1_HiLetDose', dataType: 'float', size: 4, byteOffset: 1110 },
    { name: 'Dos1_HiLetDqf', dataType: 'uint8', size: 1, byteOffset: 1114 },
    { name: 'Dos2_HiLetDose', dataType: 'float', size: 4, byteOffset: 1115 },
    { name: 'Dos2_HiLetDqf', dataType: 'uint8', size: 1, byteOffset: 1119 },
    { name: 'Dos1_LoLetDose', dataType: 'float', size: 4, byteOffset: 1120 },
    { name: 'Dos1_LoLetDqf', dataType: 'uint8', size: 1, byteOffset: 1124 },
    { name: 'Dos2_LoLetDose', dataType: 'float', size: 4, byteOffset: 1125 },
    { name: 'Dos2_LoLetDqf', dataType: 'uint8', size: 1, byteOffset: 1129 },
    { name: 'L1a_EngData_Flag', dataType: 'uint8', size: 1, byteOffset: 1130 },
    { name: 'L1a_ProtonData_Flag', dataType: 'uint8', size: 1, byteOffset: 1131 },
    { name: 'L1a_EleData_Flag', dataType: 'uint8', size: 1, byteOffset: 1132 },
    { name: 'L1a_DosData_Flag', dataType: 'uint8', size: 1, byteOffset: 1133 },
    { name: 'L1b_Processing_Flag', dataType: 'uint8', size: 1, byteOffset: 1134 },
    { name: 'N_blocks', dataType: 'uint8', size: 1, byteOffset: 1135 },
    { name: 'Instrument_Mode', dataType: 'uint8', size: 1, byteOffset: 1136 },
    { name: 'Instrument_Serial_Number', dataType: 'uint8', size: 1, byteOffset: 1137 },
    { name: 'L1a_SciData_TimeStamp', dataType: 'double', size: 8, byteOffset: 1138 },
    { name: 'quaternion_Q0', dataType: 'float', size: 4, byteOffset: 1146 },
    { name: 'quaternion_Q1', dataType: 'float', size: 4, byteOffset: 1150 },
    { name: 'quaternion_Q2', dataType: 'float', size: 4, byteOffset: 1154 },
    { name: 'quaternion_Q3', dataType: 'float', size: 4, byteOffset: 1158 },
    { name: 'ECEF_X', dataType: 'float', size: 4, byteOffset: 1162 },
    { name: 'ECEF_Y', dataType: 'float', size: 4, byteOffset: 1166 },
    { name: 'ECEF_Z', dataType: 'float', size: 4, byteOffset: 1170 },
    { name: 'yaw_flip_flag', dataType: 'uint8', size: 1, byteOffset: 1174 },
    { name: 'eclipse_flag', dataType: 'uint8', size: 1, byteOffset: 1175 },
    { name: 'solar_array_current_control', dataType: 'uint64', size: 8, byteOffset: 1176 },
    { name: 'solar_array_current', dataType: 'uint16', size: 8, byteOffset: 1184 }
];

const lowProtonDataFields = [
    { name: 'DiffElectronFluxesControlFields', dataType: 'uint64', size: 16, byteOffset: 0 },
    { name: 'DiffElectronFluxes', dataType: 'float', size: 840, byteOffset: 16 },
    { name: 'DiffElectronFluxDQFsControlFields', dataType: 'uint64', size: 16, byteOffset: 856 },
    { name: 'DiffElectronFluxDQFs', dataType: 'uint8', size: 210, byteOffset: 872 },
    { name: 'DiffIonFluxesControlFields', dataType: 'uint64', size: 16, byteOffset: 1082 },
    { name: 'DiffIonFluxes', dataType: 'float', size: 840, byteOffset: 1098 },
    { name: 'DiffIonFluxDQFsControlFields', dataType: 'uint64', size: 16, byteOffset: 1938 },
    { name: 'DiffIonFluxDQFs', dataType: 'uint8', size: 210, byteOffset: 1954 },
    { name: 'DiffElectronUncertaintiesControlFields', dataType: 'uint64', size: 16, byteOffset: 2164 },
    { name: 'DiffElectronUncertainties', dataType: 'float', size: 840, byteOffset: 2180 },
    { name: 'DiffIonUncertaintiesControlFields', dataType: 'uint64', size: 16, byteOffset: 3020 },
    { name: 'DiffIonUncertainties', dataType: 'float', size: 840, byteOffset: 3036 },
    { name: 'L1a_EngData_Flag', dataType: 'uint8', size: 1, byteOffset: 3876 },
    { name: 'L1a_IonData_Flag', dataType: 'uint8', size: 1, byteOffset: 3877 },
    { name: 'L1a_EleData_Flag', dataType: 'uint8', size: 1, byteOffset: 3878 },
    { name: 'L1b_Processing_Flag', dataType: 'uint8', size: 1, byteOffset: 3879 },
    { name: 'N_blocks', dataType: 'uint8', size: 1, byteOffset: 3880 },
    { name: 'Instrument_Mode', dataType: 'uint8', size: 1, byteOffset: 3881 },
    { name: 'Instrument_Serial_Number', dataType: 'uint8', size: 1, byteOffset: 3882 },
    { name: 'L1a_SciData_TimeStamp', dataType: 'double', size: 8, byteOffset: 3883 },
    { name: 'quaternion_Q0', dataType: 'float', size: 4, byteOffset: 3891 },
    { name: 'quaternion_Q1', dataType: 'float', size: 4, byteOffset: 3895 },
    { name: 'quaternion_Q2', dataType: 'float', size: 4, byteOffset: 3899 },
    { name: 'quaternion_Q3', dataType: 'float', size: 4, byteOffset: 3903 },
    { name: 'ECEF_X', dataType: 'float', size: 4, byteOffset: 3907 },
    { name: 'ECEF_Y', dataType: 'float', size: 4, byteOffset: 3911 },
    { name: 'ECEF_Z', dataType: 'float', size: 4, byteOffset: 3915 },
    { name: 'yaw_flip_flag', dataType: 'uint8', size: 1, byteOffset: 3919 },
    { name: 'eclipse_flag', dataType: 'uint8', size: 1, byteOffset: 3920 },
    { name: 'solar_array_current_1', dataType: 'uint16', size: 8, byteOffset: 3921 },
    { name: 'solar_array_current_2', dataType: 'uint16', size: 8, byteOffset: 3929 }
];

const xRayDataFields = [
    { name: 'irradiance_xrsa1', dataType: 'float', size: 4, byteOffset: 0 },
    { name: 'irradiance_xrsa2', dataType: 'float', size: 4, byteOffset: 4 },
    { name: 'primary_xrsa', dataType: 'uint8', size: 1, byteOffset: 8 },
    { name: 'irradiance_xrsb1', dataType: 'float', size: 4, byteOffset: 9 },
    { name: 'irradiance_xrsb2', dataType: 'float', size: 4, byteOffset: 13 },
    { name: 'primary_xrsb', dataType: 'uint8', size: 1, byteOffset: 17 },
    { name: 'xrs_ratio', dataType: 'float', size: 4, byteOffset: 18 },
    { name: 'corrected_current_xrsa_1', dataType: 'float', size: 4, byteOffset: 22 },
    { name: 'corrected_current_xrsa_2', dataType: 'float', size: 4, byteOffset: 26 },
    { name: 'corrected_current_xrsa_3', dataType: 'float', size: 4, byteOffset: 30 },
    { name: 'corrected_current_xrsa_4', dataType: 'float', size: 4, byteOffset: 34 },
    { name: 'corrected_current_xrsb_1', dataType: 'float', size: 4, byteOffset: 38 },
    { name: 'corrected_current_xrsb_2', dataType: 'float', size: 4, byteOffset: 42 },
    { name: 'corrected_current_xrsb_3', dataType: 'float', size: 4, byteOffset: 46 },
    { name: 'corrected_current_xrsb_4', dataType: 'float', size: 4, byteOffset: 50 },
    { name: 'dispersion_angle', dataType: 'float', size: 4, byteOffset: 54 },
    { name: 'crossdispersion_angle', dataType: 'float', size: 4, byteOffset: 58 },
    { name: 'sc_power_side', dataType: 'uint8', size: 1, byteOffset: 62 },
    { name: 'exis_flight_model', dataType: 'uint8', size: 1, byteOffset: 63 },
    { name: 'exis_configuration_id', dataType: 'uint16', size: 2, byteOffset: 64 },
    { name: 'xrs_runctrlmd', dataType: 'uint8', size: 1, byteOffset: 66 },
    { name: 'integration_time', dataType: 'float', size: 4, byteOffset: 67 },
    { name: 'exs_sl_pwr_ena', dataType: 'uint8', size: 1, byteOffset: 71 },
    { name: 'asic1_temperature', dataType: 'float', size: 4, byteOffset: 72 },
    { name: 'asic2_temperature', dataType: 'float', size: 4, byteOffset: 76 },
    { name: 'invalid_flags', dataType: 'uint8', size: 1, byteOffset: 80 },
    { name: 'xrs_det_chg', dataType: 'uint32', size: 4, byteOffset: 81 },
    { name: 'xrs_mode', dataType: 'uint8', size: 1, byteOffset: 85 },
    { name: 'sps_obs_time_control_fields', dataType: 'uint64', size: 8, byteOffset: 86 },
    { name: 'sps_obs_time', dataType: 'double', size: 32, byteOffset: 94 },
    { name: 'sps_int_time', dataType: 'uint64', size: 8, byteOffset: 126 },
    { name: 'sps_int_time_values', dataType: 'float', size: 16, byteOffset: 134 },
    { name: 'sps_temperature', dataType: 'uint64', size: 8, byteOffset: 150 },
    { name: 'sps_temperature_values', dataType: 'float', size: 16, byteOffset: 158 },
    { name: 'sps_det_chg', dataType: 'uint64', size: 8, byteOffset: 174 },
    { name: 'sps_det_chg_values', dataType: 'uint32', size: 16, byteOffset: 182 },
    { name: 'num_angle_pairs', dataType: 'uint16', size: 2, byteOffset: 198 },
    { name: 'yaw_flip_flag', dataType: 'uint8', size: 1, byteOffset: 200 },
    { name: 'au_factor', dataType: 'float32', size: 4, byteOffset: 201 },
    { name: 'quality_flags', dataType: 'uint32', size: 4, byteOffset: 205 },
    { name: 'time', dataType: 'double', size: 8, byteOffset: 209 },
    { name: 'packet_count', dataType: 'uint32', size: 4, byteOffset: 217 },
    { name: 'fov_unknown', dataType: 'uint8', size: 1, byteOffset: 221 },
    { name: 'fov_eclipse', dataType: 'uint8', size: 1, byteOffset: 222 },
    { name: 'fov_lunar_transit', dataType: 'uint8', size: 1, byteOffset: 223 },
    { name: 'fov_planet_transit', dataType: 'uint8', size: 1, byteOffset: 224 },
    { name: 'fov_off_point', dataType: 'uint8', size: 1, byteOffset: 225 },
    { name: 'quaternion_q0', dataType: 'float32', size: 4, byteOffset: 226 },
    { name: 'quaternion_q1', dataType: 'float32', size: 4, byteOffset: 230 },
    { name: 'quaternion_q2', dataType: 'float32', size: 4, byteOffset: 234 },
    { name: 'quaternion_q3', dataType: 'float32', size: 4, byteOffset: 238 },
    { name: 'ecef_X', dataType: 'float32', size: 4, byteOffset: 242 },
    { name: 'ecef_Y', dataType: 'float32', size: 4, byteOffset: 246 },
    { name: 'ecef_Z', dataType: 'float32', size: 4, byteOffset: 250 },
    { name: 'solar_array_current_control_fields', dataType: 'uint64', size: 8, byteOffset: 254 },
    { name: 'solar_array_current', dataType: 'uint16', size: 8, byteOffset: 262 },
    { name: 'SC_eclipse_flag', dataType: 'uint8', size: 1, byteOffset: 270 },
];

module.exports = {
    caduConstants,
    spacePacketConstants,
    genericDataConstants,
    apids,
    midHiProtonDataFields,
    lowProtonDataFields,
    xRayDataFields
};