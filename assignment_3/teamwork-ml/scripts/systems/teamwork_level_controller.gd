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

var activeAgentCount: int

@onready var reset_timer : Timer = $ResetTimer

var colorPalettes = [
	[Color("#E5BEED80"), Color("#9593D980"), Color("#7C90DB80"), Color("#736B9280"),Color("#7D5C6580")],
	[Color("#12130f80"), Color("#5b927980"), Color("#8fcb9b80"), Color("#eae6e580"),Color("#8f807380")],
	[Color("#69ddff80"), Color("#96cdff80"), Color("#d8e1ff80"), Color("#dbbadd80"),Color("#be92a280")],
	[Color("#5d2a4280"), Color("#fb637680"), Color("#fcb1a680"), Color("#ffdccc80"),Color("#fff9ec80")],
	[Color("#02020280"), Color("#0d281880"), Color("#04471c80"), Color("#058c4280"),Color("#16db6580")],
	[Color("#13407480"), Color("#13315c80"), Color("#0b254580"), Color("#8da9c480"),Color("#eef4ed80")],
	[Color("#8e9aaf80"), Color("#8e9aaf80"), Color("#efd3d780"), Color("#feeafa80"),Color("#dee2ff80")],
	[Color("#5603ad80"), Color("#8367c780"), Color("#b3e9c780"), Color("#c2f8cb80"),Color("#f0fff180")]
]

func _ready() -> void:
	var palette = colorPalettes[randi() % colorPalettes.size()]

	if has_node("TargetPosition"):
		var target_position_node := get_node("TargetPosition") as Node2D
		if target_position_node:
			target_position_node.global_position = Vector2.ZERO

	for i in range(agentNumber):
		var agent = agentScene.instantiate()
		get_parent().add_child(agent)
		agent.global_position = Vector2.ZERO
		agents.append(agent)
		var col = palette[randi() % palette.size()]
		agent.change_color(col)
	
	activeAgentCount = agentNumber
	Signals.agent_deactivated.connect(_on_agent_deactivated)
	
	# reset a timer to trigger state reset
	reset_timer.timeout.connect(reset_state)
	set_timer()

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
	var agent = agents[agentIndex] as MLAgent
	if agent.current_state == MLAgent.AgentState.INACTIVE:
		return

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
				shuffle_packed_array_in_place(velocity_entries)
				velocity_entries = velocity_entries.slice(0, velocity_entries.size()/2)

				for entry in velocity_entries:
					var vel_parts = entry.split(",", false)
					if vel_parts.size() < 3:
						print("Malformed velocity entry (weird num of components): '%s'" % entry)
						continue

					var vel_x = vel_parts[0].to_float()
					var vel_y = vel_parts[1].to_float()
					if not is_finite(vel_x) or not is_finite(vel_y):
						print("Malformed velocity entry (non-finite values): '%s'" % entry)
						continue
					
					var result_round = vel_parts[2].to_int()
					var neighbor_distance = vel_parts[3].to_float() if vel_parts.size() > 3 else 0.0
					if not is_finite(neighbor_distance) or neighbor_distance < 0.0:
						print("Malformed velocity entry (invalid distance): '%s'" % entry)
						continue

					sum_velocity += _round_weighted_velocity(Vector2(vel_x, vel_y), result_round, neighbor_distance)
					count += 1

				if count == 0:
					print("No valid velocity entries received for agent %d" % response_agent_index)
					# maybe we want to do something here?
					continue

				
				var average_velocity = sum_velocity / float(count)
				if not is_finite(average_velocity.x) or not is_finite(average_velocity.y):
					push_warning("Computed NaN average velocity, skipping agent %d" % response_agent_index)
					continue

				var agent = agents[response_agent_index] as MLAgent
				if agent.has_method("update_direction"):
					agent.update_direction(average_velocity)
	
	# Remove completed requests in reverse order to maintain indices
	for i in range(requests_to_remove.size() - 1, -1, -1):
		pending_requests.remove_at(requests_to_remove[i])
	   
func _round_weighted_velocity(velocity: Vector2, result_round: int, neighbor_distance: float = 0.0) -> Vector2:
	# combine recency and proximity so stale and distant neighbors influence less
	var round_difference = current_round - result_round
	var decay_factor = 1.0 / (1.0 + round_difference) if weigh_recency else 1.0
	var proximity_factor = 1.0 / (1.0 + neighbor_distance) if weigh_proximity else 1.0
	return velocity * decay_factor * proximity_factor

func shuffle_packed_array_in_place(arr: PackedStringArray) -> void:
	var n = arr.size()
	# Iterate from the end of the array down to the second element
	for i in range(n - 1, 0, -1):
		# Pick a random index from 0 to i
		var j = randi() % (i + 1)
		
		# Swap the elements at i and j
		var temp = arr[i]
		arr[i] = arr[j]
		arr[j] = temp

# this starts a new round, incrementing our request systems
func reset_state() -> void:
	print("Resetting state...")
	# var colorPalette = colorPalettes[randi() % colorPalettes.size()]
	var palette = colorPalettes[randi() % colorPalettes.size()]

	Signals.reset_agents.emit()

	activeAgentCount = agentNumber
	print("active agent count reset to %d" % activeAgentCount)
	if GameManager.tm_state != GameManager.TeamworkGameState.RESETTING:
		GameManager.tm_state = GameManager.TeamworkGameState.RESETTING
		_send_increase_round_request()
	
	# Close all pending UDP requests
	for request in pending_requests:
		request["socket"].close()
	pending_requests.clear()
	
	for agent in agents:
		agent.reset()
		var col = palette[randi() % palette.size()]
		agent.change_color(col)
		agent.global_position = Vector2.ZERO
	
	# update the tree
	Signals.send_rebuild_signal.emit()
	set_timer()


func _send_increase_round_request() -> void:
	var udp := PacketPeerUDP.new()
	var bind_result := udp.bind(0)
	if bind_result != OK:
		push_warning("Failed to bind UDP socket for increase_round request")
		return

	udp.set_dest_address(pythonServerIp, pythonQueryPort)
	udp.put_packet("increase_round".to_utf8_buffer())
	udp.close()
	current_round += 1
	

func _on_agent_deactivated() -> void:
	activeAgentCount -= 1
	print("An agent was deactivated. Active agent count: %d" % activeAgentCount)
	if activeAgentCount <= 0:
		reset_state()

func set_timer() -> void:
	reset_timer.stop()
	reset_timer.wait_time = randf_range(25.0, 35.0)
	reset_timer.start()
