const {readHexFile} = require('./pcapParser');
const {assembleSpacePackets, decodeSpacePackets} = require('./ingestor');
const {parseProtonMidHi} = require('./genericDataParser');

const main = async () => {
    const hexPackets = await readHexFile('packets.csv')
        .catch((err) => {
            console.log(err);
            return;
        });

    const data = assembleSpacePackets(hexPackets);
    console.log(data);
}

main();