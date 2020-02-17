var app = new Vue({
    el: "#app",
    data: {
        clip: 3,
        cutoff: 0,
        maxCutoff: 100,
        scribble: null,
        loading: false,
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
            this.clip = 3;
            this.cutoff = 0;
            await this.scribble.process(this.clip, this.cutoff);
            this.loading = false;
            this.maxCutoff = this.scribble.paths.length;
        },
    },
    watch: {
        clip: function(val) {
            this.scribble.drawLines(val, this.cutoff);
        },
        cutoff: function(val) {
            this.scribble.drawLines(this.clip, val);
        },
    },
});
