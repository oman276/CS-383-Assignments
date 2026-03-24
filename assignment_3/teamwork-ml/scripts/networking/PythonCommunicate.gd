extends Node

var py_server : UDPServer

func _ready() -> void:
    py_server = UDPServer.new()
    py_server.listen(4242)

# this may allow us to ping a server 
func _process(_delta: float) -> void:
    if py_server.is_connection_available():
        var packet = py_server.take_packet()
        var data = packet.get_string_from_utf8()
        print("Received from Python: ", data)
        # Echo back the received data
        py_server.send_packet(packet.get_address(), packet.get_port(), "Echo: " + data)