gulp-cache-buster
=================

Gulp plugin that searches for asset references (URLs) and replaces them
with a cache busted representation.

This plugin was designed to work with [gulp-hasher][1]

[![Build Status](https://travis-ci.org/disintegrator/gulp-cache-buster.svg)](https://travis-ci.org/disintegrator/gulp-cache-buster)

## Install

    npm install --save-dev gulp-cache-buster

## Usage

Options with default values shown:

    buster({
      env: 'development',
      hashes: {},
      assetRoot: '',
      assetURL: '/',
      tokenRegExp: /ASSET{(.*?)}/g,
      hashLength: 8
    })

- `env`: the target environment for the current build
- `hashes`: an object containing mappings of asset paths to their hash digests
- `assetRoot`: points to the root folder containing assets e.g. 'dist/'
- `tokenRegExp`: pattern that describes how asset references are presented in your source code (css, less, jade, html, etc...)
    - With the default setting you define an asset reference like so: `background-image: url(ASSET{assets/images/pingu.jpg});`
    - This option is usually left as-is
- `hashLength`: the number of characters to use from the asset's hash digest
    - With the default value this plugin will generate url's like so: `background-image: url(http://cdn.example.com/assets/images/pingu.jpg?v=df23b44e});`
    - This option is usually left as-is

If the plugin encounters an asset path that is not present in the `hashes`
mapping, the plugin will not add the url query parameter
(the `?v=df23b44e` part).

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

There is additional support for some common switches for selecting minified
and/or gzipped assets as shown below:

    <link rel="stylesheet" href="ASSET{assets/styles/style.css,min}" />
    <script src="ASSET{assets/scripts/vendor.js,min,gz}"></script>

If the `env` option is set to production these lines will turn into something like this:

    <link rel="stylesheet" href="https://cdn.mysite.com/assets/styles/style.min.css?v=af1358" />
    <script src="https://cdn.mysite.com/assets/scripts/vendor.min.js.gz?v=db231bc"></script>

... also assumes `assetURL` is https://cdn.mysite.com/


We can build the following gulpfile tasks:

    var autoprefixer = require('gulp-autoprefixer');
    var buster = require('gulp-cache-buster');
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

    // Using gulp-cache-buster in a css workflow looks like this:
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

- [gulp-hasher][1] which can be used with gulp-cache-buster to obtain a mapping
of asset paths and their md5 digests

[1]: https://github.com/disintegrator/gulp-hasher

## Contributing

Pull requests are welcome. If you add functionality, then please add unit tests to cover it.

## License

MIT © George Haidar

