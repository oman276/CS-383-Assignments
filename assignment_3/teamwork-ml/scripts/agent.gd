extends CharacterBody2D
class_name MLAgent

# moves around the scene based on a velocity sent by the level controller
# level controller will ping server for velocity updates for an agent every n seconds

var direction: Vector2 = Vector2.ZERO
@export var speed: float = 50.0
@export var maxDeviation: float = 0.05

@onready var randColor = Color(randf(), randf(), randf(), 0.5)
var path_line: Line2D

@export var lineWidth: float = 5.0

enum AgentState {
	ACTIVE,
	INACTIVE
}
@onready var current_state: AgentState = AgentState.ACTIVE
@onready var sprite : Sprite2D = $CollisionShape2D/Sprite2D

#eventually have us pass in the color from above so we're painting something new every time
func _ready() -> void:
	global_position = Vector2.ZERO

	if sprite:
		sprite.modulate = randColor

	path_line = Line2D.new()
	path_line.default_color = randColor
	path_line.width = lineWidth
	path_line.z_index = -1
	path_line.top_level = true
	add_child(path_line)
	path_line.add_point(global_position, 0)
	path_line.add_point(Vector2.ZERO, 1)

	velocity = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)).normalized() * speed


func _physics_process(_delta: float) -> void:
	if current_state == AgentState.INACTIVE:
		return

	if velocity == Vector2.ZERO or is_nan(velocity.x) or is_nan(velocity.y):
		push_warning("Agent %d has invalid velocity, assigning random direction" % get_instance_id())
		velocity = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)).normalized() * speed

	move_and_slide()

	if path_line.get_point_count() > 0:
		path_line.set_point_position(0, global_position)

	if get_slide_collision_count() > 0:
		_impact(get_slide_collision(0).get_normal())

func update_direction(new_direction: Vector2) -> void:
	velocity = Vector2.ZERO
	if new_direction == Vector2.ZERO or is_nan(new_direction.x) or is_nan(new_direction.y):
		new_direction = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)).normalized()
	direction = new_direction.normalized()
	direction.x += randf_range(-maxDeviation, maxDeviation)
	direction.y += randf_range(-maxDeviation, maxDeviation)
	direction = direction.normalized()
	if direction == Vector2.ZERO or is_nan(direction.x) or is_nan(direction.y):
		push_warning("Agent %d computed invalid direction vector, assigning random direction: %s" % [get_instance_id(), direction])
		direction = Vector2(randf_range(-1.0, 1.0), randf_range(-1.0, 1.0)).normalized()
	velocity = direction * speed
	path_line.add_point(global_position, 1)

	# print("agent %d new direction: %s, velocity: %s" % [get_instance_id(), direction, velocity])

func _impact(normal : Vector2) -> void:
	# why does this break the engine?
	normal = normal.normalized()
	if normal == Vector2.ZERO || is_nan(normal.x) || is_nan(normal.y):
		print("rejecting invalid normal vector: %s" % normal)
		return
	var mirrored : Vector2 = velocity.bounce(normal)
	Signals.note_velocity.emit(global_position, mirrored)
	deactivate()

func reset() -> void:
	direction = Vector2.ZERO
	velocity = Vector2.ZERO
	global_position = Vector2.ZERO
	current_state = AgentState.ACTIVE
	if sprite:
		sprite.modulate = randColor
	if path_line:
		path_line.clear_points()
		path_line.add_point(global_position, 0)
		path_line.add_point(Vector2.ZERO, 1)

func deactivate() -> void:
	Signals.agent_deactivated.emit()
	current_state = AgentState.INACTIVE
	velocity = Vector2.ZERO
	if sprite:
		sprite.modulate = Color(0.0, 0.0, 0.0, 0.0)
