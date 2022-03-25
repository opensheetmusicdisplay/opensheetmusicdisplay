precision mediump float;
uniform sampler2D u_image;
varying vec4 v_position;

#define NUM_ROWS 5
#define ELEMENT_HEIGHT 300

void main() {
    const float halfPixel = 1.0 / float(ELEMENT_HEIGHT * 2);

    vec2 absolutePosition = (v_position.xy + vec2(1.0)) / vec2(2.0);
    float absX = absolutePosition.x;
    float absY = absolutePosition.y;

    int skyLine = 0;
    for (int i = 0; i < ELEMENT_HEIGHT; ++i) {
        float ratioY = float(i) / float(ELEMENT_HEIGHT);
        float relY = (ratioY - 0.5 + halfPixel) / float(NUM_ROWS);
        float x = absX;
        float y = absY + relY;

        float currentAlpha = texture2D(u_image, vec2(x, y)).a;
        if (currentAlpha > 0.0) {
            skyLine = i;
            break;
        }
    }

    int bottomLine = ELEMENT_HEIGHT;
    for (int i = ELEMENT_HEIGHT - 1; i >= 0; --i) {
        float ratioY = float(i) / float(ELEMENT_HEIGHT);
        float relY = (ratioY - 0.5 + halfPixel) / float(NUM_ROWS);
        float x = absX;
        float y = absY + relY;

        float currentAlpha = texture2D(u_image, vec2(x, y)).a;
        if (currentAlpha > 0.0) {
            bottomLine = i;
            break;
        }
    }

    int r = skyLine;
    if (r > 256) {
        r -= 256;
    }
    int g = bottomLine;
    if (g > 256) {
        g -= 256;
    }
    int b = (skyLine / 256 * 16) + (bottomLine / 256);

    gl_FragColor = vec4(float(r) / 255.0, float(g) / 255.0, float(b) / 255.0, 1.0);
}
