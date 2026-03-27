extends Node2D

@export var sendPerSecond: int = 10
var timeSinceLastSend: float = 0.0
# delta of sending updates per second
@onready var sendDelta: float = 1.0 / sendPerSecond

var hasStartPosition: bool = false
var lastMousePosition: Vector2 = Vector2.ZERO


func _process(delta: float) -> void:
	timeSinceLastSend += delta

	if Input.is_action_just_released("mouse"):
		#print("mouse up")
		hasStartPosition = false

	elif Input.is_action_just_pressed("mouse"):
		#print("mouse down")
		# start recording mouse positions
		hasStartPosition = true
		lastMousePosition = get_global_mouse_position()

	elif hasStartPosition:
		var currentMousePosition = get_global_mouse_position()
		var direction = currentMousePosition - lastMousePosition
		if direction != Vector2.ZERO:
			#print("sending velocity update to Python server: %s" % direction)

			var message = "update,%f,%f,%f,%f" % [
				currentMousePosition.x,
				currentMousePosition.y,
				direction.x,
				direction.y
			]
			var udp = PacketPeerUDP.new()
			udp.set_dest_address("127.0.0.1", 5005)
			udp.put_packet(message.to_utf8_buffer())
			udp.close()

		lastMousePosition = currentMousePosition
