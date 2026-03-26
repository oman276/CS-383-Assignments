print("Starting imports...")

import socket
from constants import SERVER_IP, UPDATES_PORT, QUERY_PORT
import select
from sklearn.neighbors import KDTree

print("Finished imports...")

# Create one UDP socket per port and bind so we can receive packets.
updates_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
query_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

updates_socket.bind((SERVER_IP, UPDATES_PORT))
query_socket.bind((SERVER_IP, QUERY_PORT))

sockets_to_listen = [updates_socket, query_socket]

positions = []
velocities = []
kd_tree = None


def parse_message(raw_data):
    decoded = raw_data.decode().strip()
    parts = [part.strip() for part in decoded.split(",") if part.strip() != ""]
    return decoded, parts


def format_velocity_response(nearest_velocities):
    if not nearest_velocities:
        return ""
    return ";".join(f"{vx},{vy}" for vx, vy in nearest_velocities)


def handle_action(parts):
    global kd_tree

    if not parts:
        return "error,empty message"

    action = parts[0].lower()

    if action == "update":
        print("Handling update action")
        if len(parts) < 5:
            return "error,update requires: update,x,y,velX,velY"

        try:
            x = float(parts[1])
            y = float(parts[2])
            vel_x = float(parts[3])
            vel_y = float(parts[4])
        except ValueError:
            return "error,update values must be numeric"

        positions.append((x, y))
        velocities.append((vel_x, vel_y))
        print(f"added position ({x}, {y}) and velocity ({vel_x}, {vel_y})")
        return "ok,updated"

    if action == "rebuild":
        if not positions:
            return "error,no positions available"

        kd_tree = KDTree(positions)
        return "ok,rebuilt"

    if action == "query":
        if len(parts) < 4:
            return "error,query requires: query,x,y,k"

        if kd_tree is None:
            return "error,kd tree not built"

        try:
            query_x = float(parts[1])
            query_y = float(parts[2])
            k = int(parts[3])
        except ValueError:
            return "error,query values must be numeric"

        if k <= 0:
            return "error,k must be > 0"

        k = min(k, len(positions))
        _, indices = kd_tree.query([[query_x, query_y]], k=k)
        nearest_velocities = [velocities[index] for index in indices[0]]
        return f"ok,{format_velocity_response(nearest_velocities)}"

    return f"error,unknown action: {action}"



# constant loop
# we want to pass data into the kd-tree AND get nearest neighbor on different requests

print("Starting server...")

while True:
    readable, _, _ = select.select(sockets_to_listen, [], [])
    print("Received data on a port")
    for sock in readable:
        data, addr = sock.recvfrom(1024)
        decoded, parts = parse_message(data)
        response = handle_action(parts)

        if sock is updates_socket:
            print("received update socket packet")
        elif sock is query_socket:
            print("received query socket packet")

        print(f"Data: {decoded} from {addr}")
        print(f"Response: {response}")
        sock.sendto(response.encode(), addr)