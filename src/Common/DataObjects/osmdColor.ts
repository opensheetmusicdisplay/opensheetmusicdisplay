export class OSMDColor {
    public alpha: number;
    public red: number;
    public green: number;
    public blue: number;

    constructor(alpha: number, red: number, green: number, blue: number) {
        this.alpha = alpha;
        this.red = red;
        this.green = green;
        this.blue = blue;
    }
    constructor(red: number, green: number, blue: number) {
        this.alpha = 255;
        this.red = red;
        this.green = green;
        this.blue = blue;
    }
    public static get Black(): OSMDColor {
        return new OSMDColor(0, 0, 0);
    }
    public static get DeepSkyBlue(): OSMDColor {
        return new OSMDColor(0, 191, 255);
    }
    public static get Green(): OSMDColor {
        return new OSMDColor(20, 160, 20);
    }
    public static get Magenta(): OSMDColor {
        return new OSMDColor(255, 0, 255);
    }
    public static get Orange(): OSMDColor {
        return new OSMDColor(255, 128, 0);
    }
    public static get Red(): OSMDColor {
        return new OSMDColor(240, 20, 20);
    }
    public static get Disabled(): OSMDColor {
        return new OSMDColor(225, 225, 225);
    }
    public static get DarkBlue(): OSMDColor {
        return new OSMDColor(0, 0, 140);
    }
    public static get Debug1(): OSMDColor {
        return new OSMDColor(200, 0, 140);
    }
    public static get Debug2(): OSMDColor {
        return new OSMDColor(100, 100, 200);
    }
    public static get Debug3(): OSMDColor {
        return new OSMDColor(0, 50, 140);
    }
}
