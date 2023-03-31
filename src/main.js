const {readHexFile} = require('./pcapParser');
const assembleSpacePackets = require('./ingestor');

const main = async () => {
    const hexPackets = await readHexFile('packets.csv')
        .catch((err) => {
            console.log(err);
            return;
        });

    const spacePackets = assembleSpacePackets(hexPackets);
    console.log(spacePackets);
}

main();