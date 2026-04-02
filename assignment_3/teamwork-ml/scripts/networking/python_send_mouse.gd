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
		print("SENDING REBUILD SIGNAL")
		hasStartPosition = false
		Signals.send_rebuild_signal.emit()

	elif Input.is_action_just_pressed("mouse"):
		hasStartPosition = true
		lastMousePosition = get_global_mouse_position()

	elif hasStartPosition:
		var currentMousePosition = get_global_mouse_position()
		var direction = currentMousePosition - lastMousePosition
		direction = direction.normalized() 
		if direction != Vector2.ZERO and not is_nan(direction.x) and not is_nan(direction.y):
			print("PSM send update: location %s, direction %s" % [lastMousePosition, direction])
			Signals.note_velocity.emit(lastMousePosition, direction)
		else:
			push_warning("Invalid direction vector computed from mouse input, ignoring: %s" % direction)

		lastMousePosition = currentMousePosition
