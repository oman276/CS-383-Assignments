extends Node

@export var player: Node2D

@export var agentScene: PackedScene
@export var agentNumber: int = 5
var agents: Array[Node2D] = []

@export var updatePerSecond: int = 10
@export var queryNeighborCount: int = 3
@export var pythonServerIp: String = "127.0.0.1"
@export var pythonQueryPort: int = 5006
var timeSinceLastUpdate: float = 0.0

# Pending UDP requests: array of {socket, agent_index}
var pending_requests: Array = []

var current_round: int = 1

# debug variables
var weigh_recency: bool = true
var weigh_proximity: bool = true


func _ready() -> void:
	if has_node("TargetPosition"):
		var target_position_node := get_node("TargetPosition") as Node2D
		if target_position_node:
			target_position_node.global_position = Vector2.ZERO

	for i in range(agentNumber):
		var agent = agentScene.instantiate()
		get_parent().add_child(agent)
		agent.global_position = Vector2.ZERO
		agents.append(agent)

func _process(delta: float) -> void:
	if GameManager.tm_state == GameManager.TeamworkGameState.RESETTING:
		return

	# Poll all pending UDP requests for responses
	_poll_pending_requests()

	timeSinceLastUpdate += delta
	if timeSinceLastUpdate >= 1.0 / updatePerSecond:
		timeSinceLastUpdate = 0.0
		_update_agent()
	
	if Input.is_action_just_pressed("reset"):
		reset_state()

func _update_agent() -> void:
	if agents.is_empty():
		return

	# pick a random agent
	var agentIndex = randi() % agents.size()
	var agent = agents[agentIndex]
	# request a new velocity for that agent from the Python server
	var query_message = "query,%f,%f,%d,%d" % [agent.global_position.x, agent.global_position.y, queryNeighborCount, agentIndex]
	var udp := PacketPeerUDP.new()
	var bind_result := udp.bind(0)
	if bind_result != OK:
		push_warning("Failed to bind UDP socket for Python query")
		return

	udp.set_dest_address(pythonServerIp, pythonQueryPort)
	udp.put_packet(query_message.to_utf8_buffer())
	
	# Store this socket and agent index for polling later
	pending_requests.append({
		"socket": udp,
		"agent_index": agentIndex
	})


func _poll_pending_requests() -> void:
	var requests_to_remove = []
	
	for i in range(pending_requests.size()):
		var request = pending_requests[i]
		var udp = request["socket"]
		
		if udp.get_available_packet_count() > 0:
			var response = udp.get_packet().get_string_from_utf8().strip_edges()
			udp.close()
			requests_to_remove.append(i)
			
			# Process the response
			if response.begins_with("ok,"):
				var parts = response.substr(3).split(",", false)
				if parts.size() < 1:
					continue

				var response_agent_index = parts[0].to_int()
				if response_agent_index < 0 or response_agent_index >= agents.size():
					print("Received response for invalid agent index: %d" % response_agent_index)
					continue

				var velocity_entries = []
				if parts.size() > 1:
					var velocity_string = ",".join(parts.slice(1))
					velocity_entries = velocity_string.split(";", false)

				var sum_velocity = Vector2.ZERO
				var count = 0

				# some schochastic culling to get more interesting movement patterns
				#velocity_entries.shuffle()
				#velocity_entries = velocity_entries.slice(0, velocity_entries.size()/2)

				for entry in velocity_entries:
					var vel_parts = entry.split(",", false)
					if vel_parts.size() != 3:
						print("Malformed velocity entry (weird num of components): '%s'" % entry)
						continue

					var vel_x = vel_parts[0].to_float()
					var vel_y = vel_parts[1].to_float()
					var result_round = vel_parts[2].to_int() if vel_parts.size() > 2 else 0
					sum_velocity += _round_weighted_velocity(Vector2(vel_x, vel_y), result_round)
					count += 1

				if count == 0:
					continue

				var average_velocity = sum_velocity / float(count)
				var agent = agents[response_agent_index]
				if agent.has_method("update_direction"):
					agent.update_direction(average_velocity)
	
	# Remove completed requests in reverse order to maintain indices
	for i in range(requests_to_remove.size() - 1, -1, -1):
		pending_requests.remove_at(requests_to_remove[i])
	   
func _round_weighted_velocity(velocity: Vector2, result_round: int) -> Vector2:
	# we could fiddle with this decay factor but I think this works for now
	var round_difference = current_round - result_round
	var decay_factor = 1.0 / (1.0 + round_difference) if weigh_recency else 1.0
	return velocity * decay_factor

# this starts a new round, incrementing our request systems
func reset_state() -> void:
	print("Resetting state...")

	GameManager.tm_state = GameManager.TeamworkGameState.RESETTING
	
	# Close all pending UDP requests
	for request in pending_requests:
		request["socket"].close()
	pending_requests.clear()
	
	for agent in agents:
		agent.reset()
		agent.global_position = Vector2.ZERO
	current_round += 1
	
	# update the tree
	var query_message = "rebuild"
	var udp := PacketPeerUDP.new()
	var bind_result := udp.bind(0)
	if bind_result != OK:
		push_warning("Failed to bind UDP socket for Python query")
		print("Failed to bind UDP socket for Python query")
		GameManager.tm_state = GameManager.TeamworkGameState.RUNNING
		return

	udp.set_dest_address(pythonServerIp, pythonQueryPort)
	udp.put_packet(query_message.to_utf8_buffer())

	# Poll briefly for one response packet on this same socket.
	var max_wait_ms := 50
	var waited_ms := 0
	while udp.get_available_packet_count() == 0 and waited_ms < max_wait_ms:
		OS.delay_msec(1)
		waited_ms += 1

	if udp.get_available_packet_count() == 0:
		print("No response received for reset query... :(")
		udp.close()

	print("reset done")
	GameManager.tm_state = GameManager.TeamworkGameState.RUNNING
