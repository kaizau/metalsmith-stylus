var stylus = require('stylus');
var minimatch = require('minimatch');
var join = require('path').join;
var path = require('path');

function plugin (opts) {
  opts = opts || {};
  opts.paths = (opts.paths || []).map(absPath);

  return function (files, metalsmith, done) {
    var destination = metalsmith.destination();
    var source = metalsmith.source();
    var styles = Object.keys(files).filter(minimatch.filter("*.+(styl|stylus)", {matchBase: true}));
    var fingerprint = metalsmith.metadata().fingerprint;

    var paths = styles.map(function (path) {
      var ret = path.split('/');
      ret.pop();
      return source + '/' + ret.join('/');
    });

    opts.paths = paths.concat(opts.paths);

    styles.forEach(function (file, index, arr) {
      var out = file.split('.');
      out.pop();
      out = out.join('.') + '.css';
      var s = stylus(files[file].contents.toString())
        .set('filename', file);

        for (var o in opts) {
          if (o === 'use' || o === 'define') { continue; }
          s.set(o, opts[o]);
        }
        if (opts.use) {
          opts.use.forEach(function(fn) { s.use(fn); })
        }
        if (opts.define) {
          for (var d in opts.define) {
            s.define(d, opts.define[d]);
          }
        }

        if (fingerprint) {
          var absFile = join(source, file).split('/');
          absFile.pop();
          absFile = absFile.join('/');
      
          s.define('fingerprint', function(name){
            return path.relative(absFile, join(source, fingerprint[name.string]))
          });
        }

        s.render(function (err, css) {
          if (err) throw err;
          delete files[file];
          files[out] = { contents: new Buffer(css) };
          if (opts.sourcemap) {
            files[out + '.map'] = { contents: new Buffer(JSON.stringify(s.sourcemap)) };
          }
        });
    });
    done();
  };
}

module.exports = plugin;

function absPath(relative) {
  var cwd = process.cwd();
  if (relative.slice(0, cwd.length) === cwd) return relative;
  return join(process.cwd(), relative);
}
