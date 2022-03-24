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

    float skyLine = 0.0;
    for (int i = 0; i < ELEMENT_HEIGHT; ++i) {
        float ratioY = float(i) / float(ELEMENT_HEIGHT);
        float relY = (ratioY - 0.5 + halfPixel) / float(NUM_ROWS);
        float x = absX;
        float y = absY + relY;

        float currentAlpha = texture2D(u_image, vec2(x, y)).a;
        if (currentAlpha > 0.0) {
            skyLine = ratioY;
            break;
        }
    }

    float bottomLine = 1.0;
    for (int i = ELEMENT_HEIGHT - 1; i >= 0; --i) {
        float ratioY = float(i) / float(ELEMENT_HEIGHT);
        float relY = (ratioY - 0.5 + halfPixel) / float(NUM_ROWS);
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
