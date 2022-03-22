precision mediump float;
uniform sampler2D u_image;
varying vec4 v_position;

#define NUM_ROWS 5

void main() {
    vec2 absolutePosition = (v_position.xy + vec2(1.0)) / vec2(2.0);
    float absX = absolutePosition.x;
    float absY = absolutePosition.y;

    float skyLine = 0.0;
    for (int i = 0; i < 300; ++i) {
        float ratioY = float(i) / 299.0;
        float relY = (ratioY - 0.5) / float(NUM_ROWS);
        float x = absX;
        float y = absY + relY;

        float currentAlpha = texture2D(u_image, vec2(x, y)).a;
        if (currentAlpha > 0.0) {
            skyLine = ratioY;
            break;
        }
    }

    float bottomLine = 1.0;
    for (int i = 299; i >= 0; --i) {
        float ratioY = float(i) / 299.0;
        float relY = (ratioY - 0.5) / float(NUM_ROWS);
        float x = absX;
        float y = absY + relY;

        float currentAlpha = texture2D(u_image, vec2(x, y)).a;
        if (currentAlpha > 0.0) {
            bottomLine = ratioY;
            break;
        }
    }

    gl_FragColor = vec4(skyLine, bottomLine, 1, 1);
}
