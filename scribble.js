// Image processing code heavily adapted from:
// https://github.com/Scott-Cooper/Drawbot_image_to_gcode_v2


class Scribble {
    constructor(cvs) {
        this.canvas = cvs;
        this.context = this.canvas.getContext('2d');
    }

    async load(f) {
        var reader = new FileReader();
        return new Promise(resolve => {
            reader.onload = e => {
                this.img = new Image();
                this.img.onload = () => {
                    if (this.img.naturalWidth > this.img.naturalHeight) {
                        this.canvas.width = 400;
                        this.canvas.height = Math.floor(this.canvas.width * this.img.naturalHeight / this.img.naturalWidth);
                    } else {
                        this.canvas.height = 400;
                        this.canvas.width = Math.floor(this.canvas.height * this.img.naturalWidth / this.img.naturalHeight);
                    }
                    this.reset();
                    this.grayscale();
                    resolve();
                };
                this.img.src = e.target.result;
            };
            reader.readAsDataURL(f);
        });
    }

    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    reset() {
        this.clear();

        this.context.drawImage(this.img, 0, 0, this.canvas.width, this.canvas.height);
        this.imgData = this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);

        this.lines = [];
        this.paths = [];
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
    
    rotate() {
        this.reset();

        var [priorWidth, priorHeight] = [this.canvas.width, this.canvas.height];
        this.canvas.width = priorHeight;
        this.canvas.height = priorWidth;

        this.context.save();
        this.context.translate(this.canvas.width / 2, this.canvas.height / 2);
        this.context.rotate(Math.PI / 2);
        this.context.drawImage(this.img, - priorWidth / 2, - priorHeight / 2, priorWidth, priorHeight);
        this.img.src = this.canvas.toDataURL("image/png");
        this.context.restore();

        this.reset();
    }

    async process(clip, cutoff, stroke=20) {
        var start = this.darkestSamplePoint();
        var finish;

        while (this.meanValue() < 240) {
            let line = [start];
            for (let i = 0; i < 100; i++) {
                let darkest_option = 256;
                for (let phi = Math.PI * Math.random(); phi < 3 * Math.PI; phi += Math.PI / 3) {
                    let x = bound(start.x + Math.floor(stroke * Math.cos(phi)), 0, this.canvas.width - 1);
                    let y = bound(start.y + Math.floor(stroke * Math.sin(phi)), 0, this.canvas.height - 1);
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
        this.drawLines(clip, cutoff);
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

    drawLines(clip, cutoff) {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.lineWidth = 1 / 16;
        this.context.strokeStyle = 'blue';

        for (let p = 0; p < this.paths.length - cutoff; p++) {
            this.context.stroke(this.paths[p]);
        }

        var clipbox = new Path2D();
        this.context.lineWidth = 1;
        this.context.strokeStyle = 'black';
        clipbox.rect(clip, clip, this.canvas.width - 2 * clip, this.canvas.height - 2 * clip);
        this.context.stroke(clipbox);
    }
}

function bound(num, low, high) {
    return Math.min(Math.max(num, low), high);
}
