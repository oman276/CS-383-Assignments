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

func _physics_process(_delta: float) -> void:
    if current_state == AgentState.INACTIVE:
        return

    # path_line.add_point(global_position, 0)
    move_and_slide()
    path_line.set_point_position(0, global_position)

    if get_slide_collision_count() > 0:
        _impact(get_slide_collision(0).get_normal())

func update_direction(new_direction: Vector2) -> void:
    velocity = Vector2.ZERO
    direction = new_direction.normalized()
    direction.x += randf_range(-maxDeviation, maxDeviation)
    direction.y += randf_range(-maxDeviation, maxDeviation)
    direction = direction.normalized()
    velocity = direction * speed
    path_line.add_point(global_position, 1)

func _impact(normal : Vector2) -> void:
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

func deactivate() -> void:
    Signals.agent_deactivated.emit()
    current_state = AgentState.INACTIVE
    velocity = Vector2.ZERO
    if sprite:
        sprite.modulate = Color(0.0, 0.0, 0.0, 0.0)