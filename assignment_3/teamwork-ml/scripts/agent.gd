extends CharacterBody2D

# moves around the scene based on a velocity sent by the level controller
# level controller will ping server for velocity updates for an agent every n seconds

var direction: Vector2 = Vector2.ZERO
@export var speed: float = 50.0

func _physics_process(delta: float) -> void:
    move_and_slide()

func update_direction(new_direction: Vector2) -> void:
    direction = new_direction.normalized()
    velocity = direction * speed