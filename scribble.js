// Image processing code heavily adapted from:
// https://github.com/Scott-Cooper/Drawbot_image_to_gcode_v2


class Scribble {
    constructor(cvs, f) {
        this.canvas = cvs;
        this.context = this.canvas.getContext('2d');
        
        var reader = new FileReader();
        reader.onload = e => {
            var img = new Image();
            img.onload = () => {
                if (img.naturalWidth > img.naturalHeight) {
                    this.canvas.width = 400;
                    this.canvas.height = Math.floor(this.canvas.width * img.naturalHeight / img.naturalWidth);
                } else {
                    this.canvas.height = 400;
                    this.canvas.width = Math.floor(this.canvas.height * img.naturalWidth / img.naturalHeight);
                }
                this.context.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                
                this.imgData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
                this.lines = [];
                this.paths = [];
                
                this.prepare();
                this.process();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(f);
    }
    
    async prepare() {
        this.grayscale();
        this.refresh();
    }
    
    refresh() {
        this.context.putImageData(this.imgData, 0, 0);
        return new Promise(resolve => setTimeout(resolve, 0));
    }
    
    grayscale() {
        var pixels = this.imgData.data;
        for (let i = 0; i < pixels.length; i += 4) {
            let avg = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
            pixels[i] = pixels[i + 1] = pixels[i + 2] = avg;
        }
    }
    
    async process(stroke_length=20) {
        var start = this.darkestSamplePoint();
        var finish;

        while (this.meanValue() < 240) {
            let line = [start];
            for (let i = 0; i < 100; i++) {
                let darkest_option = 256;
                for (let phi = Math.PI * Math.random(); phi < 3 * Math.PI; phi += Math.PI / 3) {
                    let x = bound(start.x + Math.floor(stroke_length * Math.cos(phi)), 0, this.canvas.width - 1);
                    let y = bound(start.y + Math.floor(stroke_length * Math.sin(phi)), 0, this.canvas.height - 1);
                    let test_sum = 0, test_count = 0;
                    for (let pt of start.bresenhamTo(new Point(x, y))) {
                        test_count++;
                        test_sum += this.get(pt);
                    }
                    if (test_sum / test_count < darkest_option) {
                        darkest_option = test_sum / test_count;
                        finish = new Point(x, y);
                    }
                }
                for (let pt of start.bresenhamTo(finish)) {
                    this.set(pt, Math.min(255, this.get(pt) + 50));
                }
                line.push(finish);
                start = finish;
            }
            this.lines.push(line);

            await this.refresh();
        }

        this.buildPaths();
        this.drawLines();
    }

    darkestSamplePoint(step=10) {
        var x = Math.floor(step * Math.random());
        var y = 0;
        
        var darkest_pt = new Point(x, y);
        var darkest_val = this.get(darkest_pt);
        
        while (x < this.canvas.width) {
            y = Math.floor(step * Math.random());
            while (y < this.canvas.height) {
                let pt = new Point(x, y);
                if (darkest_val > this.get(pt)) {
                    darkest_pt = pt;
                    darkest_val = this.get(darkest_pt);
                }
                y += Math.floor(step * Math.random());
            }
            x += Math.floor(step * Math.random());
        };
        
        return darkest_pt;
    }

    get(pt) {
        return this.imgData.data[4 * (pt.y * this.canvas.width + pt.x)];
    }

    set(pt, val) {
        this.imgData.data[4 * (pt.y * this.canvas.width + pt.x)] = val;
        return val;
    }

    * points() {
        var pixels = this.imgData.data;

        for (let i = 0; i < pixels.length; i += 4) {
            yield new Point((i / 4) % this.canvas.width, Math.floor((i / 4) / this.canvas.width));
        }
    }

    meanValue() {
        var mean_total = 0, mean_count = 0;
        for (let pt of this.points()) {
            mean_count++;
            mean_total += this.get(pt);
        }
        return mean_total / mean_count;
    }

    buildPaths() {
        for (let line of this.lines) {
            let path = new Path2D();
            let start = line[0];
            path.moveTo(start.x, start.y);
            for (let i = 1; i < line.length; i++) {
                path.lineTo(line[i].x, line[i].y);
            }
            this.paths.push(path);
        }
    }

    drawLines(options=Scribble._draw_options) {
        this.context.fillStyle = 'white';
        this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.lineWidth = 1 / 16;
        this.context.strokeStyle = 'blue';

        for (let p = 0; p < this.paths.length - options.cutoff; p++) {
            this.context.stroke(this.paths[p]);
        }

        var clip = new Path2D();
        this.context.lineWidth = 1;
        this.context.strokeStyle = 'black';
        clip.rect(options.clip, options.clip, this.canvas.width - 2 * options.clip, this.canvas.height - 2 * options.clip);
        this.context.stroke(clip);
    }
}

Scribble._draw_options = {
    cutoff: 0,
    clip: 5
};


function bound(num, low, high) {
    return Math.min(Math.max(num, low), high);
}
