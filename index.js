var _ = require('underscore');
var sass = require('node-sass');
var through = require('through2');
var path = require('path');

var sassDefaults = {
  includePaths: [],
  outputStyle: 'compressed'
};

module.exports = sassr;

function sassr(file, opts) {

  if (!/\.(scss|css)$/.test(file)) return through();

  var omitFields = ['file', 'data', 'success', 'error'];
  opts = _.omit(_.defaults({}, opts, sassDefaults), omitFields);

  var buffer = '';

  function push(chunk, enc, cb) {
    buffer += chunk;
    cb();
  }

  function end(cb) {
    var stream = this;
    sass.render(_.defaults({
      data: buffer,
      success: success,
      error: error,
      includePaths: [path.dirname(file)].concat(opts.includePaths)
    }, opts));
    function success(css) {
      var moduleBody = sassrModuleWith( JSON.stringify(css) );
      stream.push( moduleBody );
      cb();
    }
    function error(err) {
      var message = 'sassr: ' + err + ' in ' + file;
      var moduleBody = errorModuleWith(message);
      stream.push( moduleBody );
      stream.emit('error', message);
      cb();
    }
  }

  return through(push, end);
}

function sassrModuleWith(css) {
  return [
    'var style = require("sassr/style");',
    'var css = ' + css + ';',
    'var appended;',
    'module.exports.getStyleElement = function() {',
    '  return style.style;',
    '};',
    'module.exports.getCSSText = function() {',
    '  return css;',
    '};',
    'module.exports.append = function() {',
    '  if (!appended) style.inject(css);',
    '  appended = true;',
    '  return style.style;',
    '};',
    'module.exports.remove = function() {',
    '  if (appended) style.eject(css);',
    '  appended = false;',
    '  return style.style;',
    '};'
  ].join('\n');
}

function errorModuleWith(message) {
  return [
    'var style = require("sassr/style");',
    'module.exports.append = module.exports.remove = function() {',
    '  console.error("' + message + '");',
    '  return style;',
    '};'
  ].join('\n');
}
