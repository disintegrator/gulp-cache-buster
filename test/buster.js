'use strict';

var path = require('path');
var url = require('url');

var _ = require('lodash');
var File = require('vinyl');
var assert = require('chai').assert;
var es = require('event-stream');

var buster = require('..');

var makeCSSBuffer = function(transformPath) {
  return new Buffer([
    '.logo {',
    '  width: 200px;',
    '  background: url(' + transformPath('assets/images/logo.svg') + ');',
    '  background-size: contain;',
    '  background-repeat: no-repeat;',
    '  background-position: center;',
    '}',
    '.logo-basic {',
    '  width: 80px;',
    '  background: url(' + transformPath('assets/images/logo-basic.png') + ');',
    '  background-size: contain;',
    '  background-repeat: no-repeat;',
    '  background-position: center;',
    '}'
  ].join('\n'), 'utf8');
};

var bufferToStream = function(buf) {
  var current = 0;
  var len = buf.length;
  return es.readable(function(count, cb) {
    if (current < len) {
      this.emit('data', buf.slice(current, current + count));
      current += count;
    }
    if (current >= len) {
      this.emit('end');
    }

    cb();
  });
};


describe('gulp-cache-buster', function() {
  var hashes = {
    'assets/images/logo.svg': '2fdb2405940a5ee7be866046d714b74f',
    'assets/images/logo-basic.png': '9c2d3666248c1f28af9d63ab38725d72'
  };
  var expected = makeCSSBuffer(function(rel) {
    var h = hashes[rel];
    if (!h) { return rel; }
    var v = h.substr(0, 8);
    return url.format({
      protocol: 'https',
      host: 'example.com',
      pathname: '/' + rel,
      query: {v: v}
    });
  });
  var expectedMode1 = makeCSSBuffer(function(rel) {
    var h = hashes[rel];
    if (!h) { return rel; }
    var v = h.substr(0, 8);
    var index = rel.lastIndexOf('/');
    var pathname = rel.slice(0, index) + '/v-' + v + rel.slice(index, rel.length);	
    return url.format({
      protocol: 'https',
      host: 'example.com',
      pathname: pathname
    });
  });
  describe('in streaming mode', function() {
    it('should cache bust asset references', function(done) {
      var file = new File({
        contents: bufferToStream(makeCSSBuffer(function(rel) {
          return 'ASSET{' + rel + '}';
        }))
      });

      es.readArray([file])
        .pipe(buster({
          hashes: hashes,
          assetURL: 'https://example.com'
        }))
        .pipe(es.map(function(file, cb) {
          file.pipe(es.wait(function(err, data) {
            assert.isNull(err, 'Unexpected error');
            assert.equal(data.toString('utf8'), expected.toString('utf8'));
            cb(null, file);
          }));
        }))
        .pipe(es.wait(function(err) {
          assert.isNull(err, 'Unexpected error');
          done();
        }));
    });
  });

  describe('in buffer mode', function() {
    it('should cache bust asset references', function(done) {
      var file = new File({
        contents: makeCSSBuffer(function(rel) {
          return 'ASSET{' + rel + '}';
        })
      });

      es.readArray([file])
        .pipe(buster({
          hashes: hashes,
          assetURL: 'https://example.com'
        }))
        .pipe(es.map(function(file, cb) {
          file.pipe(es.wait(function(err, data) {
            assert.isNull(err, 'Unexpected error');
            assert.equal(data.toString('utf8'), expected.toString('utf8'));
            cb(null, file);
          }));
        }))
        .pipe(es.wait(function(err) {
          assert.isNull(err, 'Unexpected error');
          done();
        }));
    });
  });

  describe('with null files', function() {
    it('should cache bust asset references', function(done) {
      var file = new File({
        path: __dirname,
        contents: null
      });
      es.readArray([file])
        .pipe(buster({
          hashes: hashes,
          assetURL: 'https://example.com'
        }))
        .pipe(es.map(function(file, cb) {
          assert.ok(file.isNull());
          cb(null, file);
        }))
        .pipe(es.wait(function(err) {
          assert.isNull(err, 'Unexpected error');
          done();
        }));
    });
  });

  describe('with unrecognised asset reference', function() {
    it('should not add cache busting query to asset url', function(done) {
      var file = new File({
        contents: makeCSSBuffer(function(rel) {
          return 'ASSET{' + rel + '_123}';
        })
      });

      es.readArray([file])
        .pipe(buster({
          hashes: hashes,
          assetURL: 'https://example.com'
        }))
        .pipe(es.map(function(file, cb) {
          var exp = makeCSSBuffer(function(rel) {
            return url.format({
              protocol: 'https',
              host: 'example.com',
              pathname: '/' + rel + '_123',
            });
          });
          file.pipe(es.wait(function(err, data) {
            assert.isNull(err, 'Unexpected error');
            assert.equal(data.toString('utf8'), exp.toString('utf8'));
            cb(null, file);
          }));
        }))
        .pipe(es.wait(function(err) {
          assert.isNull(err, 'Unexpected error');
          done();
        }));
    });
  });

  describe('with 7 as hash length option', function() {
    it('should add cache busting query with 7 charcters', function(done) {
      var file = new File({
        contents: makeCSSBuffer(function(rel) {
          return 'ASSET{' + rel + '}';
        })
      });

      es.readArray([file])
        .pipe(buster({
          hashes: hashes,
          assetURL: 'https://example.com',
          hashLength: 7
        }))
        .pipe(es.map(function(file, cb) {
          file.pipe(es.wait(function(err, data) {
            var exp = makeCSSBuffer(function(rel) {
              var h = hashes[rel];
              if (!h) { return rel; }
              var v = h.substr(0, 7);
              return url.format({
                protocol: 'https',
                host: 'example.com',
                pathname: '/' + rel,
                query: {v: v}
              });
            });
            assert.isNull(err, 'Unexpected error');
            assert.equal(data.toString('utf8'), exp.toString('utf8'));
            cb(null, file);
          }));
        }))
        .pipe(es.wait(function(err) {
          assert.isNull(err, 'Unexpected error');
          done();
        }));
    });
  });

  describe('with a custom assetRoot option', function() {
    it('should cache bust asset references', function(done) {
      var file = new File({
        contents: makeCSSBuffer(function(rel) {
          return 'ASSET{' + rel + '}';
        })
      });

      var customHashes = _.object(_.map(hashes, function(val, key) {
        return [path.join(__dirname, 'dist', key), val];
      }));

      es.readArray([file])
        .pipe(buster({
          hashes: customHashes,
          assetRoot: path.join(__dirname, 'dist'),
          assetURL: 'https://example.com'
        }))
        .pipe(es.map(function(file, cb) {
          file.pipe(es.wait(function(err, data) {
            assert.isNull(err, 'Unexpected error');
            assert.equal(data.toString('utf8'), expected.toString('utf8'));
            cb(null, file);
          }));
        }))
        .pipe(es.wait(function(err) {
          assert.isNull(err, 'Unexpected error');
          done();
        }));
    });
  });
  
  describe('with mode 1 option', function() {
    it('should insert hash in url pathname before filename', function(done) {
      var file = new File({
        contents: makeCSSBuffer(function(rel) {
          return 'ASSET{' + rel + '}';
        })
      });

      var customHashes = _.object(_.map(hashes, function(val, key) {
        return [path.join(__dirname, 'dist', key), val];
      }));

      es.readArray([file])
        .pipe(buster({
          hashes: customHashes,
          assetRoot: path.join(__dirname, 'dist'),
          assetURL: 'https://example.com',
          mode: 1
        }))
        .pipe(es.map(function(file, cb) {
          file.pipe(es.wait(function(err, data) {
            assert.isNull(err, 'Unexpected error');
            assert.equal(data.toString('utf8'), expectedMode1.toString('utf8'));
            cb(null, file);
          }));
        }))
        .pipe(es.wait(function(err) {
          assert.isNull(err, 'Unexpected error');
          done();
        }));      
    });
  });
});
