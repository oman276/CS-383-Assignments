extends OwenGameManager

# any extra bits will go here

enum TeamworkGameState {
	RUNNING,
	RESETTING
}

@onready var tm_state: TeamworkGameState = TeamworkGameState.RUNNING

func _ready() -> void:
	super._ready()
	Signals.note_velocity.connect(send_velocity_update)
	pass

func send_velocity_update(location: Vector2, velocity: Vector2) -> void:
	var normalized = velocity.normalized()
	var message = "update,%f,%f,%f,%f" % [location.x, location.y, normalized.x, normalized.y]
	var udp = PacketPeerUDP.new()
	udp.set_dest_address("127.0.0.1", 5005)
	udp.put_packet(message.to_utf8_buffer())
	udp.close()
