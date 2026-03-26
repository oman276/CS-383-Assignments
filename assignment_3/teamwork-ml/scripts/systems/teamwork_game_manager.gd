extends OwenGameManager

# any extra bits will go here

enum TeamworkGameState {
    RUNNING,
    RESETTING
}

@onready var tm_state: TeamworkGameState = TeamworkGameState.RUNNING