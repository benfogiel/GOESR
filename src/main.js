import {readHexFile} from './pcapParser.js';
import SpacePacketIngestor from './ingestor.js';

const main = async () => {
    const hexPackets = await readHexFile('packets.csv')
        .catch((err) => {
            console.log(err);
            return;
        });
    const spacePacketIngestor = new SpacePacketIngestor();
    for (let i = 0; i < hexPackets.length; i++) {
        const packet = hexPackets[i];
        try {
            spacePacketIngestor.processPacket(packet);
        } catch (error) {
            console.log("ERROR processing packet:", error);
        }
    }

    console.log(spacePacketIngestor);
}

main();