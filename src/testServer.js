import dgram from 'dgram';
import {readHexFile} from './pcapParser.js';

const main = async () => {

    const server = dgram.createSocket('udp4');
    const multicastAddress = '239.24.75.80'; // Replace with the multicast address you used in the client
    const multicastPort = 50020; // Replace with the port you used in the client

    const hexPackets = await readHexFile('packets_large.csv')
        .catch((err) => {
            console.log(err);
            return;
        });

    server.bind(() => {
        server.setBroadcast(true);
        server.setMulticastTTL(128);
    });

    server.on('error', (err) => {
        console.log(`Error: ${err.stack}`);
        server.close();
    });

    for (let i = 12000; i < hexPackets.length; i++) {
        const packet = hexPackets[i];

        const buffer = Buffer.from(packet.join(''), 'hex');
        server.send(buffer, 0, buffer.length, multicastPort, multicastAddress, (err) => {
            if (err) {
            console.error('Error sending message:', err);
            } else {
            console.log('Message sent:', i);
            }
        });
        // sleep for 7 ms
        await new Promise((resolve) => setTimeout(resolve, 7));
    }
}

main();
