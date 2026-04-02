import logging

import socket
from constants import SERVER_IP, UPDATES_PORT, QUERY_PORT
import select
import math
from sklearn.neighbors import KDTree
import random

logging.basicConfig(
	level=logging.DEBUG,
	format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("data_loop")

logger.info("Imports loaded, starting data loop setup")

updates_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
query_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
logger.info("Created UDP sockets for updates and queries")

for udp_socket in (updates_socket, query_socket):
	try:
		udp_socket.ioctl(socket.SIO_UDP_CONNRESET, False)
		logger.debug("Disabled SIO_UDP_CONNRESET on socket fd=%s", udp_socket.fileno())
	except (AttributeError, OSError):
		logger.debug("Could not disable SIO_UDP_CONNRESET on socket fd=%s", udp_socket.fileno())

updates_socket.bind((SERVER_IP, UPDATES_PORT))
query_socket.bind((SERVER_IP, QUERY_PORT))
logger.info("Bound updates socket to %s:%s", SERVER_IP, UPDATES_PORT)
logger.info("Bound query socket to %s:%s", SERVER_IP, QUERY_PORT)

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
	logger.debug("Parsed message decoded='%s' parts=%s", decoded, parts)
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
	logger.debug(
		"Added position=(%.4f, %.4f) velocity=(%.4f, %.4f) round=%s total_points=%s",
		x,
		y,
		vel_x,
		vel_y,
		current_round,
		len(positions),
	)


def _is_finite_number(value):
	return math.isfinite(value)


def _ensure_kd_tree():
	global kd_tree, kd_tree_size, kd_tree_dirty
	logger.info(
		"Rebuilding KD Tree requested; current points=%s dirty=%s",
		len(positions),
		kd_tree_dirty,
	)

	# Safety net: remove any non-finite values before building the tree.
	finite_entries = [
		(pos, vel)
		for pos, vel in zip(positions, velocities)
		if _is_finite_number(pos[0]) and _is_finite_number(pos[1])
		and _is_finite_number(vel[0]) and _is_finite_number(vel[1])
	]
	if len(finite_entries) != len(positions):
		removed = len(positions) - len(finite_entries)
		positions[:] = [pos for pos, _ in finite_entries]
		velocities[:] = [vel for _, vel in finite_entries]
		kd_tree_dirty = True
		logger.warning("Removed %s non-finite points before KDTree rebuild", removed)

	if cull_after >= 0:
		min_round = current_round - cull_after
		filtered_entries = [
			(pos, vel)
			for pos, vel in zip(positions, velocities)
			if vel[2] >= min_round
		]

		if len(filtered_entries) != len(positions):
			removed = len(positions) - len(filtered_entries)
			positions[:] = [pos for pos, _ in filtered_entries]
			velocities[:] = [vel for _, vel in filtered_entries]
			kd_tree_dirty = True
			logger.info(
				"Culled %s stale points older than round=%s during rebuild",
				removed,
				min_round,
			)

	if not positions:
		kd_tree = None
		kd_tree_size = 0
		kd_tree_dirty = False
		logger.warning("No valid positions available to build KDTree")
		return False

	logger.info("Building KDTree with %s entries", len(positions))
	kd_tree = KDTree(positions)
	kd_tree_size = len(positions)
	kd_tree_dirty = False
	logger.info("KDTree ready with size=%s", kd_tree.data.shape[0])
	logger.debug("Positions length is %s entries", kd_tree_size)


	return True


def _is_kd_tree_ready_for_query():
	# Queries can keep using the last explicitly rebuilt tree, even if dirty.
	ready = kd_tree is not None and kd_tree_size > 0
	if not ready:
		logger.debug("KDTree not ready for query; kd_tree=%s kd_tree_size=%s", kd_tree is not None, kd_tree_size)
	return ready

def handle_action(parts, decoded=""):
	global kd_tree, kd_tree_size, kd_tree_dirty, last_positional_update, current_round
	logger.debug("Handling action for parts=%s", parts)

	if not parts:
		logger.warning("Received empty message")
		return "error,empty message"

	# we should be sending more explicit messages from Godot, we should error if we recieve malformed messages
	action = parts[0].lower()
	logger.info("Received action='%s' payload=%s", action, parts[1:])

	if action == "update":
		if len(parts) < 5:
			logger.warning("Malformed update; expected 5 fields got %s", len(parts))
			return "error,update requires: update,x,y,velX,velY"

		try:
			x = float(parts[1])
			y = float(parts[2])
			vel_x = float(parts[3])
			vel_y = float(parts[4])
		except ValueError:
			logger.warning("Update rejected; non-numeric values payload=%s", parts)
			return "error,update values must be numeric"

		if not all(_is_finite_number(v) for v in (x, y, vel_x, vel_y)):
			logger.warning("Update rejected; non-finite values payload=%s", parts)
			return "error,update values must be finite"

		if vel_x == 0 and vel_y == 0:
			# assign a small random velocity to prevent zero-velocity points from dominating queries
			vel_x = random.uniform(-0.5, 0.5)
			vel_y = random.uniform(-0.5, 0.5)
			logger.debug("Update had zero velocity; replaced with random velocity=(%.4f, %.4f)", vel_x, vel_y)
		_add_position_velocity(x, y, vel_x, vel_y)
		logger.info("Update accepted for position=(%.4f, %.4f)", x, y)
		return "ok,updated"

	if action == "rebuild":
		logger.info("Rebuild action requested")
		if not _ensure_kd_tree():
			logger.warning("Rebuild failed: no positions available")
			return "error,no positions available"

		logger.info("Rebuild action completed successfully")
		return "ok,rebuilt"

	if action == "increase_round":
		current_round += 1
		logger.info("Round increased to %s", current_round)
		return f"ok,round,{current_round}"

	if action == "query":
		if len(parts) < 5:
			logger.warning("Malformed query; expected 5 fields got %s", len(parts))
			return "error,query requires: query,x,y,k,agent_index"

		if not _is_kd_tree_ready_for_query():
			logger.warning("Query rejected because KDTree is not ready")
			return "error,no rebuilt kd_tree available; send rebuild"

		try:
			query_x = float(parts[1])
			query_y = float(parts[2])
			k = int(parts[3])
			agent_index = int(parts[4])
		except ValueError:
			logger.warning("Query rejected; non-numeric values payload=%s", parts)
			return "error,query values must be numeric"

		if k <= 0:
			logger.warning("Query rejected; invalid k=%s", k)
			return "error,k must be > 0"

		k = min(k, kd_tree_size)
		logger.debug(
			"Running KDTree query at (%.4f, %.4f) with k=%s (tree_size=%s) for agent_index=%s",
			query_x,
			query_y,
			k,
			kd_tree_size,
			agent_index,
		)
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
		logger.debug("Query nearest_results=%s", nearest_results)
		# response format: "ok,agent_index,velX1,velY1,round1,distance1;velX2,velY2,round2,distance2;..."
		logger.info("Query completed for agent_index=%s with %s results", agent_index, len(nearest_results))
		return f"ok,{agent_index},{format_velocity_response(nearest_results)}"

	# malformed message
	logger.error("Received malformed message decoded='%s' parts=%s", decoded, parts)
	return "error,unsupported action"


# constant loop
# we want to pass data into the kd-tree AND get nearest neighbor on different requests

logger.info("Starting server loop")

# initialize the tree with initial starting values at 0,0 so we get sent in random directions
# at the start instead of being so locked in
positions = [(0.0, 0.0), (0.0, 0.0), (0.0, 0.0), (0.0, 0.0)]
velocities = [(0.0, 1.0, current_round), (0.0, -1.0, current_round), 
				   (1.0, 0.0, current_round), (-1.0, 0.0, current_round)]
_ensure_kd_tree()
logger.info("Seeded initial points and completed initial KDTree build")

while True:
	logger.debug("Waiting for UDP activity on %s sockets", len(sockets_to_listen))
	readable, _, _ = select.select(sockets_to_listen, [], [])
	logger.debug("Readable sockets count=%s", len(readable))
	for sock in readable:
		try:
			data, addr = sock.recvfrom(1024)
		except ConnectionResetError as err:
			logger.warning("recvfrom reset by peer, continuing: %s", err)
			continue
		logger.debug("Received %s bytes from %s on port=%s", len(data), addr, sock.getsockname()[1])
		decoded, parts = parse_message(data)
		response = handle_action(parts, decoded)
		logger.debug("Sending response='%s' to %s", response, addr)

		sock.sendto(response.encode(), addr)