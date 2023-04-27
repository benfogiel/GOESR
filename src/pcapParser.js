import pcapp from 'pcap-parser';
import fs from 'fs';
import readline from 'readline';
import csv from 'csv-parser';

export const unpackPcap = (filename) => new Promise((resolve, reject) => {
    const parser = pcapp.parse(filename);
    const bitStreams = [];

    parser.on('packet', (packet) => {
        const data = packet.data;
        const bitStream = data.toString('hex');
        if (parseInt(bitStream.length/2) === 2048){
            bitStreams.push(bitStream);
        }
    });

    parser.on('end', () => {
        resolve(bitStreams);
    });

    parser.on('error', (err) => {
        reject(err);
    });
});

export const readHexFile = (hexFile) => {
    // Create a readable stream to read the file in chunks
    const stream = fs.createReadStream(hexFile, { encoding: 'utf8' });
  
    // Create an empty array to store the hex packets
    const hexPackets = [];
  
    // Create a readline interface to read the stream line by line
    const rl = readline.createInterface({
      input: stream,
      terminal: false
    });
  
    // Define what happens when a line is read from the stream
    rl.on('line', function(line) {
      // Split the line by comma to create an array of hex bytes
      const hexBytes = line.split(',');
  
      // Add the packet to the array
      hexPackets.push(hexBytes);
    });
  
    // Define what happens when the stream has finished reading the file
    return new Promise((resolve, reject) => {
      rl.on('close', function() {
        resolve(hexPackets);
      });
  
      // Define what happens if an error occurs while reading the file
      rl.on('error', function(err) {
        reject(err);
      });
    });
  };