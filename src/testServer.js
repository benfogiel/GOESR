import dgram from 'dgram';
import {readHexFile} from './pcapParser.js';

const main = async () => {
    const hexPackets = await readHexFile('packets.csv')
        .catch((err) => {
            console.log(err);
            return;
        });

    const server = dgram.createSocket('udp4');

    for (let i = 0; i < hexPackets.length; i++) {
        const packet = hexPackets[i];

        const buffer = Buffer.from(packet.join(''), 'hex');
        server.send(buffer, 0, buffer.length, 50020, 'localhost', (err) => {
            if (err) {
                console.log(err);
            } else {
                console.log(`Packet ${i+1} sent successfully.`);
            }
        });
        // sleep for 7 ms
        await new Promise((resolve) => setTimeout(resolve, 7));
    }
}

main();
