extends Node

@export var player: Node2D

@export var agentScene: PackedScene
@export var agentNumber: int = 5
var agents: Array[Node2D] = []

@export var updatePerSecond: int = 10
@export var queryNeighborCount: int = 3
@export var pythonServerIp: String = "127.0.0.1"
@export var pythonQueryPort: int = 5006
var timeSinceLastUpdate: float = 0.0

enum GameState {
    RUNNING,
    RESETTING
}

@onready var state: GameState = GameState.RUNNING


func _ready() -> void:
    for i in range(agentNumber):
        var agent = agentScene.instantiate()
        get_parent().add_child(agent)
        agents.append(agent)


func _process(delta: float) -> void:
    if state == GameState.RESETTING:
        return

    timeSinceLastUpdate += delta
    if timeSinceLastUpdate >= 1.0 / updatePerSecond:
        timeSinceLastUpdate = 0.0
        _update_agent()
    
    if Input.is_action_just_pressed("reset"):
        reset_state()

func _update_agent() -> void:
    if agents.is_empty():
            return

    # pick a random agent
    var agent = agents[randi() % agents.size()]
    # request a new velocity for that agent from the Python server
    var query_message = "query,%f,%f,%d" % [agent.global_position.x, agent.global_position.y, queryNeighborCount]
    var udp := PacketPeerUDP.new()
    var bind_result := udp.bind(0)
    if bind_result != OK:
        push_warning("Failed to bind UDP socket for Python query")
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
        udp.close()
        return

    var response = udp.get_packet().get_string_from_utf8().strip_edges()
    udp.close()

    if not response.begins_with("ok,"):
        return

    var velocity_blob = response.substr(3)
    if velocity_blob.is_empty():
        return

    var velocity_entries = velocity_blob.split(";", false)
    var sum_velocity = Vector2.ZERO
    var count = 0

    for entry in velocity_entries:
        var parts = entry.split(",", false)
        if parts.size() != 2:
            continue

        var vel_x = parts[0].to_float()
        var vel_y = parts[1].to_float()
        sum_velocity += Vector2(vel_x, vel_y)
        count += 1

    if count == 0:
        return

    var average_velocity = sum_velocity / float(count)
    # change the agent's velocity based on the average of all velocities in the response
    if agent.has_method("update_direction"):
        agent.update_direction(average_velocity)
       

func reset_state() -> void:
    state = GameState.RESETTING
    for agent in agents:
        agent.global_position = Vector2.ZERO
        agent.update_direction(Vector2.ZERO)
    player.global_position = Vector2.ZERO
    
    # update the tree
    var query_message = "rebuild"
    var udp := PacketPeerUDP.new()
    var bind_result := udp.bind(0)
    if bind_result != OK:
        push_warning("Failed to bind UDP socket for Python query")
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
        udp.close()
        return

    state = GameState.RUNNING
