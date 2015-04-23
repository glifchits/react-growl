'use strict';

var gulp = require('gulp');
var $ = require('gulp-load-plugins')();


var path = require('path');


var browserify = require('browserify');
var source = require('vinyl-source-stream');


gulp.task('styles', function () {
  return gulp.src('./demo/main.scss')
    .pipe($.plumber())
    .pipe($.rubySass({
      style: 'expanded',
      precision: 10
    }))
    .pipe($.autoprefixer({browsers: ['last 1 version']}))
    .pipe(gulp.dest('.tmp'));
});


gulp.task('jshint', function () {
  return gulp.src([
    './demo/**/*.js', './demo/**/*.jsx',
    './src/**/*.js', './src/**/*.jsx'
  ])
    .pipe($.jsxtransform())
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
});


gulp.task('scripts', function () {
  return browserify('./demo/app.jsx')
    .bundle()
    .pipe(source('./demo/app.js'))
    .pipe(gulp.dest('.tmp'));
});


gulp.task('html', ['styles', 'scripts'], function () {
  var assets = $.useref.assets({searchPath: '{.tmp,app}'});

  return gulp.src('./demo/*.html')
    .pipe(assets)
    .pipe($.if('*.js', $.uglify()))
    .pipe($.if('*.css', $.csso()))
    .pipe(assets.restore())
    .pipe($.useref())
    .pipe($.if('*.html', $.minifyHtml({conditionals: true, loose: true})))
    .pipe(gulp.dest('dist'));
});


gulp.task('jest', function () {
  var nodeModules = path.resolve('./node_modules');
  return gulp.src('app/**/__tests__')
    .pipe($.jest({
        scriptPreprocessor: nodeModules + '/gulp-jest/preprocessor.js',
        unmockedModulePathPatterns: [nodeModules + '/react']
    }));
});


gulp.task('extras', function () {
  return gulp.src([
    'demo/*.*',
    '!demo/*.html',
    'node_modules/apache-server-configs/dist/.htaccess'
  ], {
    dot: true
  }).pipe(gulp.dest('dist'));
});


gulp.task('clean', require('del').bind(null, ['.tmp', 'dist']));


gulp.task('connect', ['styles', 'scripts'], function () {
  var serveStatic = require('serve-static');
  var serveIndex = require('serve-index');
  var app = require('connect')()
    .use(require('connect-livereload')({port: 35729}))
    .use(serveStatic('.tmp'))
    .use(serveStatic('demo'))
    // paths to bower_components should be relative to the current file
    // e.g. in app/index.html you should use ../bower_components
    .use('/bower_components', serveStatic('bower_components'))
    .use(serveIndex('demo'));

  require('http').createServer(app)
    .listen(9000)
    .on('listening', function () {
      console.log('Started connect web server on http://localhost:9000');
    });
});


gulp.task('serve', ['connect', 'watch'], function () {
  require('opn')('http://localhost:9000');
});


// inject bower components
gulp.task('wiredep', function () {
  var wiredep = require('wiredep').stream;

  gulp.src('./demo/*.scss')
    .pipe(wiredep())
    .pipe(gulp.dest('demo'));

  gulp.src('./demo/*.html')
    .pipe(wiredep())
    .pipe(gulp.dest('demo'));
});


gulp.task('watch', ['connect'], function () {
  $.livereload.listen();

  // watch for changes
  gulp.watch([
    './demo/*.html',
    '.tmp/**/*.css',
    '.tmp/**/*.js',
  ]).on('change', $.livereload.changed);

  gulp.watch('./demo/**/*.scss', ['.']);
  gulp.watch('bower.json', ['wiredep']);

  // Watch .js files
  gulp.watch('./src/**/*.js', ['scripts', 'jest' ]);
});


gulp.task('build', ['jshint', 'html', 'jest', 'extras'], function () {
  return gulp.src('dist/**/*').pipe($.size({title: 'build', gzip: true}));
});


gulp.task('default', ['clean'], function () {
  gulp.start('build');
});
