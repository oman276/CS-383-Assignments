print("Starting imports...")

import socket
from constants import SERVER_IP, UPDATES_PORT, QUERY_PORT
import select
from sklearn.neighbors import KDTree

print("Finished imports...")

# Create one UDP socket per port and bind so we can receive packets.
updates_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
query_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

# On Windows, replying to short-lived UDP clients can surface WSAECONNRESET
# on recvfrom unless this flag is disabled.
for udp_socket in (updates_socket, query_socket):
    try:
        udp_socket.ioctl(socket.SIO_UDP_CONNRESET, False)
    except (AttributeError, OSError):
        pass

updates_socket.bind((SERVER_IP, UPDATES_PORT))
query_socket.bind((SERVER_IP, QUERY_PORT))

sockets_to_listen = [updates_socket, query_socket]

positions = []
velocities = []
kd_tree = None
kd_tree_size = 0
kd_tree_dirty = False
last_positional_update = None


def parse_message(raw_data):
    decoded = raw_data.decode().strip()
    parts = [part.strip() for part in decoded.split(",") if part.strip() != ""]
    return decoded, parts


def format_velocity_response(nearest_velocities):
    if not nearest_velocities:
        return ""
    return ";".join(f"{vx},{vy}" for vx, vy in nearest_velocities)


def _can_parse_float(value):
    try:
        float(value)
        return True
    except ValueError:
        return False


def _add_position_velocity(x, y, vel_x, vel_y):
    global kd_tree_dirty
    positions.append((x, y))
    velocities.append((vel_x, vel_y))
    kd_tree_dirty = True


def _ensure_kd_tree():
    global kd_tree, kd_tree_size, kd_tree_dirty
    if not positions:
        kd_tree = None
        kd_tree_size = 0
        return False

    if kd_tree is None or kd_tree_dirty:
        kd_tree = KDTree(positions)
        kd_tree_size = len(positions)
        kd_tree_dirty = False

    return True


def _is_kd_tree_ready_for_query():
    # Queries can keep using the last explicitly rebuilt tree, even if dirty.
    return kd_tree is not None and kd_tree_size > 0


def handle_action(parts):
    global kd_tree, kd_tree_size, kd_tree_dirty, last_positional_update

    if not parts:
        return "error,empty message"

    # we should be sending more explicit messages from Godot, we should error if we recieve malformed messages
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

        _add_position_velocity(x, y, vel_x, vel_y)
        print(f"added position ({x}, {y}) and velocity ({vel_x}, {vel_y})")
        return "ok,updated"

    if action == "rebuild":
        if not _ensure_kd_tree():
            return "error,no positions available"
        return "ok,rebuilt"

    if action == "query":
        if len(parts) < 5:
            return "error,query requires: query,x,y,k,agent_index"

        if not _is_kd_tree_ready_for_query():
            return "error,no rebuilt kd_tree available; send rebuild"

        try:
            query_x = float(parts[1])
            query_y = float(parts[2])
            k = int(parts[3])
            agent_index = int(parts[4])
        except ValueError:
            return "error,query values must be numeric"

        if k <= 0:
            return "error,k must be > 0"

        k = min(k, kd_tree_size)
        _, indices = kd_tree.query([[query_x, query_y]], k=k)
        nearest_velocities = [velocities[index] for index in indices[0]]
        return f"ok,{agent_index},{format_velocity_response(nearest_velocities)}"

    # malformed message
    print(f"Received malformed message: {decoded}")
    assert False, "Received malformed message" 
    return f"error,unknown action: {action}"



# constant loop
# we want to pass data into the kd-tree AND get nearest neighbor on different requests

print("Starting server...")

while True:
    readable, _, _ = select.select(sockets_to_listen, [], [])
    print("Received data on a port")
    for sock in readable:
        try:
            data, addr = sock.recvfrom(1024)
        except ConnectionResetError as err:
            print(f"recvfrom reset by peer, continuing: {err}")
            continue
        decoded, parts = parse_message(data)
        response = handle_action(parts)

        if sock is updates_socket:
            print("received update socket packet")
        elif sock is query_socket:
            print("received query socket packet")

        print(f"Data: {decoded} from {addr}")
        print(f"Response: {response}")
        sock.sendto(response.encode(), addr)