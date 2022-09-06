var app = new Vue({
    el: "#app",
    data: {
        clip: 0,
        cutoff: 0,
        maxCutoff: 100,
        stroke: 20,
        darkness: 240,
        angle: 30,
        density: 15,
        scale: 80,
        scribble: null,
        loading: false,
        control: false,
        dirty: false,
        status: 'wait',
        style: 'random',
        completion: 0,
    },
    computed: {
        ready: function() {
            return this.scribble && !this.loading;
        },
        clean: function() {
            return this.scribble === null;
        },
        machineReady: function() {
            return this.status === 'ready';
        },
    },
    methods: {
        async processFile(f) {
            this.dirty = false;
            this.loading = true;
            if (f) {
                this.scribble = new Scribble(document.getElementById('working-image'));
                await this.scribble.load(f);
                await this.scribble.refresh();
            }
            if (this.style == 'random') {
                await this.scribble.process_random(this.clip, this.cutoff, this.stroke, this.darkness);
            } else if (this.style == 'hatched') {
                await this.scribble.process_hatched(this.clip, this.cutoff, this.stroke, this.darkness, this.angle, this.density);
            }
            this.loading = false;
            this.maxCutoff = this.scribble.paths.length;
        },
        fileChanged() {
            var files = document.getElementById('file-input').files;
            if (files.length > 0) {
                this.processFile(files[0]);
            }
        },
        startOver() {
            this.scribble.clear();
            this.scribble = null;
            this.dirty = false;
        },
        async rotate() {
            this.scribble.rotate();
            this.clip = 0;
            this.cutoff = 0;
            await this.processFile();
        },
        async redraw() {
            this.scribble.reset();
            this.scribble.grayscale();
            await this.processFile();
        },
        width() {
            let cvs = this.scribble.canvas;
            if (this.orientation() === 'landscape') {
                return Math.floor(Math.min(279 * this.scale / 100, 215 * this.scale / 100 * cvs.width / cvs.height));
            } else {
                return Math.floor(Math.min(215 * this.scale / 100, 279 * this.scale / 100 * cvs.width / cvs.height));
            }
        },
        height() {
            let cvs = this.scribble.canvas;
            return Math.floor(this.width() * cvs.height / cvs.width);
        },
        orientation() {
            let cvs = this.scribble.canvas;
            if (cvs.width >= cvs.height) {
                return 'landscape';
            } else {
                return 'portrait';
            }
        },
        heartbeat() {
            result = axios.get('/api/status').then(response => {
                this.status = response.data.status;
                this.completion = response.data.completion;
            });
        },
        sendCommands(cmds) {
            axios.post('/api/command', cmds).then(function(){
                console.log('Sent commands:');
                console.log(cmds);
            });
        },
        moveBelts(L, R) {
            this.sendCommands([`G0 L${L} R${R}`]);
        },
        findCenter() {
            this.sendCommands(['G28']);
        },
        startPrint() {
            this.sendCommands(this.scribble.generateGCode(this.width(), this.height(), this.clip, this.cutoff));
        },
    },
    watch: {
        clip: function(val) {
            this.scribble.buildPaths(this.clip);
            this.scribble.drawLines(val, this.cutoff);
        },
        cutoff: function(val) {
            this.scribble.drawLines(this.clip, val);
        },
    },
});

app.heartbeat()
setInterval(app.heartbeat, 10 * 1000);
