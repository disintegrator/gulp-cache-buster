gulp-buster
===========

Gulp plugin that searches for asset references (URLs) and replaces them
with a cache busted representation.

This plugin was designed to work with [gulp-hasher][1]

[![Build Status](https://travis-ci.org/disintegrator/gulp-buster.svg)](https://travis-ci.org/disintegrator/gulp-buster)

## Install

    npm install --save-dev gulp-buster

## Usage

Options with default values shown:

    buster({
      hashes: {},   // a mapping of asset paths to their hash digests
      assetRoot: '',  // point the root folder of your assets e.g. 'dist/'
      assetURL: '/',  // the base url to use when building cache-buster asset URL
      tokenRegExp: /ASSET{(.*?)}/g,     // OPTIONAL: The pattern describing cache-busted asset references
      hashLength: 8     // OPTIONAL: the number of characters to use from the assets hash digest
    })

## Example

Given a CSS file with the following content:

    .logo {
      width: 200px;
      background: url(ASSET{assets/images/logo.svg});
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }

    .logo-basic {
      width: 80px;
      background: url(ASSET{assets/images/logo-basic.png});
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
    }

Notice that asset reference are wrapped with `ASSET{<relative_path>}`. This
notation can be changed by setting tokenRegExp.

Furthermore, while CSS is used in this example this plugin can be passed
HTML, Jade and any text files that contain the asset reference as seen in the
CSS example.

We can build the following gulpfile tasks:

    var autoprefixer = require('gulp-autoprefixer');
    var buster = require('gulp-buster');
    var gulp = require('gulp');
    var hasher = require('gulp-hasher');
    var imagemin = require('gulp-imagemin');
    var minifyCss = require('gulp-minify-css');
    var pngquant = require('imagemin-pngquant');
    var rename = require('gulp-rename');


    // First we build up asset hash digests using gulp-hasher
    gulp.task('images', function() {
      return gulp.src('assets/images/**/*')
        .pipe(imagemin({
          progressive: true,
          svgoPlugins: [{removeViewBox: false}],
          use: [pngquant()]
        }))
        .pipe(gulp.dest('dist/assets/images/'))
        .pipe(hasher());
    });

    // Using gulp-buster in a css workflow looks like this:
    gulp.task('styles', ['images'], function() {
      return gulp.src('assets/styles/themes/*/style.less')
        .pipe(autoprefixer())
        .pipe(buster({      // <-- STARTING HERE
          assetRoot: path.join(__dirname, 'dist'),
          hashes: hasher.hashes     // since images task has run we can pass in the hashes object
        }))
        .pipe(gulp.dest('dist/assets/styles/'))
        .pipe(hasher())
        .pipe(minifyCss())
        .pipe(rename({extname: '.min.css'}))
        .pipe(gulp.dest('dist/assets/styles/'))
        .pipe(hasher());
    });

## See also

- [gulp-hasher][1] which can be used with gulp-buster to obtain a mapping of
asset paths and their md5 digests

[1]: https://github.com/disintegrator/gulp-hasher

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests to cover it.

## License

MIT © George Haidar

