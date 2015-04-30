'use strict';

var path = require('path');
var url = require('url');

var _ = require('lodash');
var es = require('event-stream');
var rs = require('replacestream');

var defaults = {
  hashes: {},
  assetRoot: '',
  assetURL: '/',
  tokenRegExp: /ASSET{(.*?)}/g,
  hashLength: 8
};


var plugin = function(options) {
  var opts = _.extend({}, defaults, options);
  var replaceFunc = function(m, p1) {
    var p = path.join(opts.assetRoot, p1);
    var digest = (opts.hashes[p] || '');
    var u = url.parse(opts.assetURL);
    u.pathname += p1;
    if (digest) {
      u.query = _.extend({}, u.query, {v: digest.substr(0, opts.hashLength)});
    }
    return url.format(u);
  };
  return es.map(function(file, cb) {
    var out = file;
    if (file.isNull()) { return cb(null, out); }
    if (file.isBuffer()) {
      file.contents = new Buffer(String(file.contents)
          .replace(opts.tokenRegExp, replaceFunc));
    }
    else if (file.isStream()) {
      out = file.pipe(rs(opts.tokenRegExp, replaceFunc));
    }
    return cb(null, out);
  });
};

module.exports = plugin;
