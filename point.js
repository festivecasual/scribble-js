class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    * bresenhamTo(finish) {
        var dx = Math.abs(finish.x - this.x);
        var dy = Math.abs(finish.y - this.y);
        var sx = this.x < finish.x ? 1 : -1;
        var sy = this.y < finish.y ? 1 : -1;
        var err = dx - dy;
        
        var loc = new Point(this.x, this.y);
        yield loc;
        
        while (loc.x != finish.x && loc.y != finish.y) {
            if (err * 2 > -dy) {
                err -= dy;
                loc.x += sx;
            }
            if (err * 2 < dx) {
                err += dx;
                loc.y += sy;
            }
            yield loc;
        }
    }
}
