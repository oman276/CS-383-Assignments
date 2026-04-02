print("Starting imports...")

import socket
from constants import SERVER_IP, UPDATES_PORT, QUERY_PORT
import select
import math
from sklearn.neighbors import KDTree
import random

print("Finished imports...")

updates_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
query_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)

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

current_round = 1

# debug variables
weigh_recency = True
weigh_proximity = True
cull_after = 10

def parse_message(raw_data):
	decoded = raw_data.decode().strip()
	parts = [part.strip() for part in decoded.split(",") if part.strip() != ""]
	return decoded, parts


def format_velocity_response(nearest_results):
	if not nearest_results:
		return ""
	# each entry: (vel_x, vel_y, round, distance_to_query)
	return ";".join(
		f"{vx},{vy},{round},{distance}"
		for vx, vy, round, distance in nearest_results
	)


def _can_parse_float(value):
	try:
		float(value)
		return True
	except ValueError:
		return False


def _add_position_velocity(x, y, vel_x, vel_y):
	global kd_tree_dirty
	# we apply the current round as a sort of timestamp
	# we will weigh recency to determine the weight of the points
	positions.append((x, y))
	velocities.append((vel_x, vel_y, current_round))
	kd_tree_dirty = True


def _is_finite_number(value):
	return math.isfinite(value)


def _ensure_kd_tree():
	print("Ensuring KDTree is up to date...")
	global kd_tree, kd_tree_size, kd_tree_dirty

	# Safety net: remove any non-finite values before building the tree.
	finite_entries = [
		(pos, vel)
		for pos, vel in zip(positions, velocities)
		if _is_finite_number(pos[0]) and _is_finite_number(pos[1])
		and _is_finite_number(vel[0]) and _is_finite_number(vel[1])
	]
	if len(finite_entries) != len(positions):
		positions[:] = [pos for pos, _ in finite_entries]
		velocities[:] = [vel for _, vel in finite_entries]
		kd_tree_dirty = True

	if cull_after >= 0:
		min_round = current_round - cull_after
		filtered_entries = [
			(pos, vel)
			for pos, vel in zip(positions, velocities)
			if vel[2] >= min_round
		]

		if len(filtered_entries) != len(positions):
			positions[:] = [pos for pos, _ in filtered_entries]
			velocities[:] = [vel for _, vel in filtered_entries]
			kd_tree_dirty = True

	if not positions:
		kd_tree = None
		kd_tree_size = 0
		kd_tree_dirty = False
		print("No valid positions available to build KDTree.")
		return False

	print(f"Building KDTree with {len(positions)} entries...")
	kd_tree = KDTree(positions)
	kd_tree_size = len(positions)
	print("kd_tree size :", kd_tree.data.shape[0])
	print(f"Positions length is {kd_tree_size} entries.")


	return True


def _is_kd_tree_ready_for_query():
	# Queries can keep using the last explicitly rebuilt tree, even if dirty.
	return kd_tree is not None and kd_tree_size > 0

def handle_action(parts):
	global kd_tree, kd_tree_size, kd_tree_dirty, last_positional_update, current_round

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

		if not all(_is_finite_number(v) for v in (x, y, vel_x, vel_y)):
			return "error,update values must be finite"

		if vel_x == 0 and vel_y == 0:
			# assign a small random velocity to prevent zero-velocity points from dominating queries
			vel_x = random.uniform(-0.5, 0.5)
			vel_y = random.uniform(-0.5, 0.5)
		_add_position_velocity(x, y, vel_x, vel_y)
		return "ok,updated"

	if action == "rebuild":
		if not _ensure_kd_tree():
			return "error,no positions available"

		return "ok,rebuilt"

	if action == "increase_round":
		current_round += 1
		return f"ok,round,{current_round}"

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
		distances, indices = kd_tree.query([[query_x, query_y]], k=k)
		nearest_results = [
			(
				velocities[index][0],
				velocities[index][1],
				velocities[index][2],
				float(distances[0][pos]),
			)
			for pos, index in enumerate(indices[0])
		]
		# response format: "ok,agent_index,velX1,velY1,round1,distance1;velX2,velY2,round2,distance2;..."
		return f"ok,{agent_index},{format_velocity_response(nearest_results)}"

	# malformed message
	print(f"Received malformed message: {decoded}")
	assert False, "Received malformed message" 


# constant loop
# we want to pass data into the kd-tree AND get nearest neighbor on different requests

print("Starting server...")

# initialize the tree with initial starting values at 0,0 so we get sent in random directions
# at the start instead of being so locked in
positions = [(0.0, 0.0), (0.0, 0.0), (0.0, 0.0), (0.0, 0.0)]
velocities = [(0.0, 1.0, current_round), (0.0, -1.0, current_round), 
				   (1.0, 0.0, current_round), (-1.0, 0.0, current_round)]
_ensure_kd_tree()

while True:
	readable, _, _ = select.select(sockets_to_listen, [], [])
	# print("Received data on a port")
	for sock in readable:
		try:
			data, addr = sock.recvfrom(1024)
		except ConnectionResetError as err:
			print(f"recvfrom reset by peer, continuing: {err}")
			continue
		decoded, parts = parse_message(data)
		response = handle_action(parts)

		# print(f"Data: {decoded} from {addr}")
		# print(f"Response: {response}")
		sock.sendto(response.encode(), addr)