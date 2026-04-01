extends StaticBody2D

# contains a CollisionShape2D to instantiate with a WorldBoundaryShape2D
@export var wallScene : PackedScene

# walls point inwards
# left, right, up, down
var walls : Array[CollisionShape2D] = []

@export var wallThickness : int = 40

func _ready() -> void:
	if (wallScene != null):
		for i in range(4):
			var wall = wallScene.instantiate() as CollisionShape2D
			add_child(wall)
			walls.append(wall)

	position_walls()

# todo need to finish my signal bus to auto update this when it's rime
func position_walls():
	if walls.size() < 4:
		push_warning("Not enough walls to position")
		return
	
	var visibleRect = get_viewport().get_visible_rect()
	var canvasToWorld = get_viewport().get_canvas_transform().affine_inverse()

	# top left
	var start = canvasToWorld * (visibleRect.position + Vector2(wallThickness, wallThickness))
	# bottom right
	var end = canvasToWorld * (visibleRect.end + Vector2(-wallThickness, -wallThickness))
	
	walls[0].global_position = start
	#	walls[0].shape = walls[0].shape.duplicate() as WorldBoundaryShape2D
	walls[0].shape.normal = Vector2(1, 0)

	walls[1].global_position = end
	#	walls[1].shape = walls[1].shape.duplicate() as WorldBoundaryShape2D
	walls[1].shape.normal = Vector2(-1, 0)

	walls[2].global_position = start
	#	walls[2].shape = walls[2].shape.duplicate() as WorldBoundaryShape2D
	walls[2].shape.normal = Vector2(0, -1)

	walls[3].global_position = end
	#	walls[3].shape = walls[3].shape.duplicate() as WorldBoundaryShape2D
	walls[3].shape.normal = Vector2(0, 1)
