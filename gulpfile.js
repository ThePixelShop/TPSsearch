var gulp = require('gulp');
var $ = require("gulp-load-plugins")({
    pattern: ['gulp-*', 'gulp.*', 'main-bower-files'],
    replaceString: /\bgulp[\-.]/
});

var browserSync = require('browser-sync').create();
var reload = browserSync.reload;


gulp.task('local', function () {
    browserSync.init({
        port: 44379,
        https: true,
        server: {
            baseDir: "./"
        }
    });

    // Theme
    //gulp.watch('**/*.js', ['js']);

    gulp.watch("src/**/*", ['compress']).on('change', browserSync.reload);
    gulp.watch("./index.html").on('change', browserSync.reload);
    gulp.watch("./test.js").on('change', browserSync.reload);
});

gulp.task('compress', function () {
    gulp.src(['src/*.js'])
        .pipe($.minify({
            ext: {
                min: '.min.js'
            }
        }))
        .pipe(gulp.dest('dist'))
});

