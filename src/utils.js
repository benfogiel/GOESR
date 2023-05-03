import assert from "assert";

export const binaryStringToByteArray = (binaryString) => {
    const byteArray = new Uint8Array(binaryString.length / 8);
    for (let i = 0; i < binaryString.length; i += 8) {
        byteArray[i / 8] = parseInt(binaryString.slice(i, i + 8), 2);
    }
    return byteArray;
};

export const parseBytes = (buffer, byteOffset, size, dataType, littleEndian = true) => {
    const slicedBuffer = buffer.slice(byteOffset, byteOffset + size);
    const view = new DataView(slicedBuffer);

    const parseFloatMatrix = (rows, cols) => {
        const floatSize = 4; // bytes
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                const byteOffset = (i * cols + j) * floatSize;
                const value = new DataView(
                    slicedBuffer.slice(byteOffset, byteOffset + floatSize),
                ).getFloat32(0, littleEndian);
                row.push(value);
            }
            matrix.push(row);
        }
        return matrix;
    };

    const parseDoubleMatrix = (rows, cols) => {
        const doubleSize = 8; // bytes
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            const row = [];
            for (let j = 0; j < cols; j++) {
                const byteOffset = (i * cols + j) * doubleSize;
                const value = new DataView(
                    slicedBuffer.slice(byteOffset, byteOffset + doubleSize),
                ).getFloat64(0, littleEndian);
                row.push(value);
            }
            matrix.push(row);
        }
        return matrix;
    };

    switch (dataType) {
        case "uint8":
            return view.getUint8(0, littleEndian);
        case "uint16":
            return view.getUint16(0, littleEndian);
        case "uint32":
            return view.getUint32(0, littleEndian);
        case "uint64":
            return view.getBigUint64(0, littleEndian);
        case "float":
            return view.getFloat32(0, littleEndian);
        case "float32":
            return view.getFloat32(0, littleEndian);
        case "float32Mtx11by5":
            return parseFloatMatrix(11, 5);
        case "float32Mtx6by2":
            return parseFloatMatrix(6, 2);
        case "float32Mtx2by2":
            return parseFloatMatrix(2, 2);
        case "float32Mtx5by2":
            return parseFloatMatrix(5, 2);
        case "float64":
            return view.getFloat64(0, littleEndian);
        case "double":
            return view.getFloat64(0, littleEndian);
        case "doubleMtx1by2":
            return parseDoubleMatrix(1, 2);
        case "doubleMtx1by4":
            return parseDoubleMatrix(1, 4);
        default:
            throw new Error(`Unsupported data type: ${dataType}`);
    }
};

export const parseBits = (binaryString, bitOffset, size, dataType) => {
    switch (dataType) {
        case "bitString":
            return binaryString.slice(bitOffset, bitOffset + size);
        case "integer":
            return parseInt(binaryString.slice(bitOffset, bitOffset + size), 2);
        default:
            throw new Error(`Unsupported data type: ${dataType}`);
    }
};

export const parseByteFields = (binaryString, dataFields, littleEndian) => {
    const byteArray = binaryStringToByteArray(binaryString);
    const buffer = byteArray.buffer;
    const result = {};
    result.length = byteArray.length;

    for (const field of dataFields) {
        result[field.name] = parseBytes(
            buffer, field.byteOffset, field.size, field.dataType, littleEndian,
        );
    }

    return result;
};

export const parseBitFields = (binaryString, dataFields) => {
    const result = {};
    result.length = binaryString.length;
    const expectedBitLength = Math.max(...dataFields.map((field) => field.bitOffset + field.size));
    if (result.length !== expectedBitLength) {
        throw new Error(`Expected ${expectedBitLength} bits, got ${result.length} bits`);
    }

    for (const field of dataFields) {
        result[field.name] = parseBits(binaryString, field.bitOffset, field.size, field.dataType);
    }

    return result;
};

export const parseStruct = (binaryString, field) => {
    const result ={};
    if (!binaryString) return null;
    assert(binaryString.length === field.size,
        `binaryString must be the same length as the field size (${binaryString.length} != ${field.size})`);

    field.fields.forEach((field) => {
        if (Object.keys(field).length > 0 && field[(Object.keys(field)[0])].fields) {
            const subField = field[(Object.keys(field)[0])];
            result[Object.keys(field)[0]] = parseStruct(
                binaryString.slice(subField.bitOffset, subField.bitOffset+subField.size), subField,
            );
        } else {
            result[field.name] = parseBits(
                binaryString, field.bitOffset, field.size, field.dataType,
            );
        }
    });

    return result;
};

export const secEpochToDate = (secEpoch) => {
    // epochSec is seconds since J2000
    const j2000Epoch = Date.UTC(2000, 0, 1, 12, 0, 0, 0); // Jan 1, 2000 12:00:00 UTC
    return new Date(j2000Epoch + (secEpoch * 1000));
};

export class PacketPriorityQueue {
    constructor(rolloverNum, maxSize) {
        this.queue = [];
        this.rolloverNum = rolloverNum;
        this.maxSize = maxSize;
        assert(this.maxSize <= this.rolloverNum/4, "maxSize must be less than rolloverNum/4");
    }

    enqueue(packet, seqNum) {
        if (this.queue.length >= this.maxSize) {
            // de-queue the lowest priority packet
            this.queue.pop();
        }
        const newNode = {packet, seqNum};

        for (let i = 0; i < this.queue.length; i++) {
            if (this.queue[i].seqNum === newNode.seqNum) {
                console.log("duplicate sequence number detected within queue. Not adding new node");
                return false; // Do not add newNode if it has the same sequence number as an existing node
            }
            const diff = (newNode.seqNum - this.queue[i].seqNum + this.rolloverNum)
                % this.rolloverNum;

            if (diff > 0 && diff < this.rolloverNum / 2) {
                this.queue.splice(i, 0, newNode); // Insert newNode at index i
                return true;
            }
        }

        this.queue.push(newNode); // If newNode has the lowest priority, add it to the end of the queue
        return true;
    }

    // performs a binary search using the sequence number
    getPacket(seqNum) {
        let left = 0;
        let right = this.queue.length - 1;

        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            const midSeqNum = this.queue[mid].seqNum;

            if (midSeqNum === seqNum) {
                return this.queue[mid];
            }

            const diff = (midSeqNum - seqNum + this.rolloverNum) % this.rolloverNum;

            if (diff > 0 && diff < this.rolloverNum / 2) {
                left = mid + 1;
            } else {
                right = mid - 1;
            }
        }

        return null; // Return null if the sequence number is not found
    }

    // dequeue packet given sequence number
    dequeue(seqNum) {
        const packet = this.getPacket(seqNum);
        if (packet) {
            this.queue.splice(this.queue.indexOf(packet), 1);
            return packet;
        }
        return null;
    }
}
