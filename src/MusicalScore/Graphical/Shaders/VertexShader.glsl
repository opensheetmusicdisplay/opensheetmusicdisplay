attribute vec4 a_position;
varying vec4 v_position;

void main() {
    gl_Position = a_position;
    v_position = a_position;
}
