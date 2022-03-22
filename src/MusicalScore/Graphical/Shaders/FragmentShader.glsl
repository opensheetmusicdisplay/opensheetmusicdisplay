precision mediump float;
uniform sampler2D u_image;
varying vec4 v_position;

void main() {
    vec2 realPosition = (v_position.xy + vec2(1.0)) / vec2(2.0);
    float x = realPosition.x;
    float skyLine = 0.0;
    for (int i = 0; i < 300; ++i) {
        float y = float(i) / 299.0;
        float currentAlpha = texture2D(u_image, vec2(x, y)).a;
        if (currentAlpha > 0.0) {
            skyLine = y;
            break;
        }
    }
    
    float bottomLine = 1.0;
    for (int i = 299; i >= 0; --i) {
        float y = float(i) / 299.0;
        float currentAlpha = texture2D(u_image, vec2(x, y)).a;
        if (currentAlpha > 0.0) {
            bottomLine = y;
            break;
        }
    }
    
    gl_FragColor = vec4(skyLine, bottomLine, 1, 1);
}
