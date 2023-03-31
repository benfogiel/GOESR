import pyshark
import binascii
import csv

def pcap_to_bits(pcap_file):
    # create a PyShark capture object
    capture = pyshark.FileCapture(pcap_file, use_json=True, include_raw=True)

    with open("packets.csv", "w", newline="") as f:
        writer = csv.writer(f)
        # iterate over each packet in the capture
        for packet in capture:
            if 'udp' in packet:
                hex = packet.data.data.split(":")
                if len(hex) == 2048:
                    writer.writerow(hex)

    # close the capture object
    capture.close()

    return


if __name__ == "__main__":
    bit_streams = pcap_to_bits("GOESR.pcap")

