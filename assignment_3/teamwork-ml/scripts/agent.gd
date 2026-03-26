extends CharacterBody2D

# moves around the scene based on a velocity sent by the level controller
# level controller will ping server for velocity updates for an agent every n seconds

var direction: Vector2 = Vector2.ZERO
@export var speed: float = 50.0
@export var maxDeviation: float = 0.05


func _physics_process(delta: float) -> void:
    move_and_slide()

func update_direction(new_direction: Vector2) -> void:
    velocity = Vector2.ZERO
    direction = new_direction.normalized()
    direction.x += randf_range(-maxDeviation, maxDeviation)
    direction.y += randf_range(-maxDeviation, maxDeviation)
    direction = direction.normalized()
    print("Updating direction to %s" % direction)
    velocity = direction * speed
    print("New velocity: %s" % velocity)