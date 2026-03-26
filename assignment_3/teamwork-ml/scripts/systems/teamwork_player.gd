extends OwenTopDownController

func _physics_process(delta: float):
    if GameManager.tm_state == GameManager.TeamworkGameState.RESETTING:
        return
    super(delta)
    
    
    