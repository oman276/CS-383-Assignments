import socket
from constants import SERVER_IP, SERVER_PORT

client_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# constant loop
# we want to pass data into the kd-tree AND get nearest neighbor on different requests

while True:

    pass