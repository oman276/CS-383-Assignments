extends Node

var server: UDPServer

func _ready() -> void:
	server = UDPServer.new()
	server.listen(4242)

	GameManager.Signals.note_velocity.connect(send_velocity_update)

func _process(_delta: float) -> void:
	server.poll()
	if server.is_connection_available():
		var peer: PacketPeerUDP = server.take_connection()
		var packet = peer.get_packet()
		print("Received: '%s' %s:%s" % [packet.get_string_from_utf8(), peer.get_packet_ip(), peer.get_packet_port()])

		peer.put_packet("Hello from Godot!".to_utf8_buffer())

func send_velocity_update(position: Vector2, velocity: Vector2) -> void:
	var normalized = velocity.normalized()
	var message = "update,%f,%f,%f,%f" % [position.x, position.y, normalized.x, normalized.y]
	var udp = PacketPeerUDP.new()
	udp.set_dest_address("127.0.0.1", 5005)
	udp.put_packet(message.to_utf8_buffer())
	udp.close()