var app = new Vue({
    el: "#app",
    data: {
        clip: 0,
        cutoff: 0,
        maxCutoff: 100,
        scale: 80,
        scribble: null,
        loading: false,
        control: false,
    },
    computed: {
        ready: function() {
            return this.scribble && !this.loading;
        },
        clean: function() {
            return this.scribble === null;
        },
    },
    methods: {
        async processFile(f) {
            this.loading = true;
            this.scribble = new Scribble(document.getElementById('working-image'));
            await this.scribble.load(f);
            await this.scribble.refresh();
            await this.scribble.process(this.clip, this.cutoff);
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
        },
        async rotate() {
            this.scribble.rotate();
            this.loading = true;
            this.clip = 0;
            this.cutoff = 0;
            await this.scribble.process(this.clip, this.cutoff);
            this.loading = false;
            this.maxCutoff = this.scribble.paths.length;
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
                console.log(response);
            });
        }
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
