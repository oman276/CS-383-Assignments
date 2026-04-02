extends OwenGameManager

# any extra bits will go here

@export var pythonServerIp: String = "127.0.0.1"
@export var pythonQueryPort: int = 5006

enum TeamworkGameState {
	RUNNING,
	RESETTING
}

@onready var tm_state: TeamworkGameState = TeamworkGameState.RUNNING

func _ready() -> void:
	super._ready()
	Signals.note_velocity.connect(send_velocity_update)
	Signals.send_rebuild_signal.connect(send_rebuild_signal)
	pass

func send_velocity_update(location: Vector2, velocity: Vector2) -> void:
	print ("sending velocity update: location %s, velocity %s" % [location, velocity])

	var normalized = velocity.normalized()
	if normalized == Vector2.ZERO:
		return # no need to update if this
	var message = "update,%f,%f,%f,%f" % [location.x, location.y, normalized.x, normalized.y]
	var udp = PacketPeerUDP.new()
	udp.set_dest_address("127.0.0.1", 5005)
	udp.put_packet(message.to_utf8_buffer())
	udp.close()

func send_rebuild_signal() -> void:
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
