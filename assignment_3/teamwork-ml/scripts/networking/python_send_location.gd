extends Node2D

@export var sendPerSecond: int = 10
var timeSinceLastSend: float = 0.0
var hasLastPosition: bool = false
var lastPosition: Vector2 = Vector2.ZERO
# delta of sending updates per second
@onready var sendDelta: float = 1.0 / sendPerSecond
@onready var player = get_parent()


# every n frames, send the location of the player to the Python server
func _process(delta: float) -> void:
	timeSinceLastSend += delta
	if timeSinceLastSend >= sendDelta:
		var elapsed := timeSinceLastSend
		timeSinceLastSend = 0.0

		var message = "update,%f,%f,%f,%f" % [
			global_position.x,
			global_position.y,
			player.velocity.x,
			player.velocity.y
		]
		var udp = PacketPeerUDP.new()
		udp.set_dest_address("127.0.0.1", 5005)
		udp.put_packet(message.to_utf8_buffer())
		udp.close()

