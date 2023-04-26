const dgram = require('dgram');
const {readHexFile} = require('./pcapParser');
const {SpacePacketIngestor} = require('./ingestor');

const main = async () => {
    const hexPackets = await readHexFile('packets.csv')
        .catch((err) => {
            console.log(err);
            return;
        });

    const server = dgram.createSocket('udp4');

    for (let i = 0; i < hexPackets.length; i++) {
        const packet = hexPackets[i];

        server.send(packet, 0, packet.length, 50020, 'example.com', (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`Packet ${i+1} sent successfully.`);
            }
        });
    }
}

main();
