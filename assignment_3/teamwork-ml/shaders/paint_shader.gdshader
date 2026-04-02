shader_type canvas_item;

// This allows us to pass a noise texture from the Godot inspector
uniform sampler2D noise_texture;

// These control how hard or soft the brush edges look
uniform float edge_min : hint_range(0.0, 1.0) = 0.2;
uniform float edge_max : hint_range(0.0, 1.0) = 0.8;

void vertex() {
	// Called for every vertex the material is visible on.
}

void fragment() {
    vec4 base_color = COLOR;
    vec4 noise_sample = texture(noise_texture, SCREEN_UV);
    float rough_alpha = smoothstep(edge_min, edge_max, noise_sample.r);
    base_color.a *= rough_alpha;
    COLOR = base_color;
}

//void light() {
//	// Called for every pixel for every light affecting the CanvasItem.
//	// Uncomment to replace the default light processing function with this one.
//}
