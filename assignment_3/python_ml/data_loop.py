import socket
from constants import SERVER_IP, UPDATES_PORT, QUERY_PORT
import select

# Create one UDP socket per port and bind so we can receive packets.
updates_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
query_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

updates_socket.bind((SERVER_IP, UPDATES_PORT))
query_socket.bind((SERVER_IP, QUERY_PORT))

sockets_to_listen = [updates_socket, query_socket]

# constant loop
# we want to pass data into the kd-tree AND get nearest neighbor on different requests

print("Starting server...")

while True:
    readable, _, _ = select.select(sockets_to_listen, [], [])
    print("Received data on a port")
    for sock in readable:
        data, addr = sock.recvfrom(1024)
        if sock is updates_socket:
            print("recieved KD tree update")
            print(f"Data: {data.decode()} from {addr}")
            # Handle KD-tree addition
            pass
        elif sock is query_socket:
            print("recieved query")
            # Handle query and send prediction back to addr
            pass

    pass