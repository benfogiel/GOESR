const {readHexFile} = require('./pcapParser');
const {SpacePacketIngestor} = require('./ingestor');

const main = async () => {
    const hexPackets = await readHexFile('packets.csv')
        .catch((err) => {
            console.log(err);
            return;
        });
    const spacePacketIngestor = new SpacePacketIngestor();
    for (let i = 0; i < hexPackets.length; i++) {
        const packet = hexPackets[i];
        spacePacketIngestor.processPacket(packet);
    }

    console.log(spacePacketIngestor);
}

main();