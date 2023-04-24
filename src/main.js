const {readHexFile} = require('./pcapParser');
const {SpacePackets} = require('./ingestor');

const main = async () => {
    const hexPackets = await readHexFile('packets_large.csv')
        .catch((err) => {
            console.log(err);
            return;
        });
    const spacePackets = new SpacePackets();
    spacePackets.recordCadus(hexPackets);
    for (let i = 0; i < hexPackets.length; i++) {
        const packet = hexPackets[i];
        spacePackets.processPacket(packet);
    }

    console.log(spacePackets);
}

main();