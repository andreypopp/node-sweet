var fs        = require('fs');
var path      = require('path');
var sweet     = require('sweet.js');
var resolve   = require('resolve/lib/sync');

var eliminateIncludeMacros = sweet.loadNodeModule(
      process.cwd(),
      require.resolve('./import-macros.sjs'));

var CACHE = {};

function extractMacroIncludes(src) {
  var tokens = sweet.expand(src);
  var mods = [];

  var tok, mod;

  for (var i = 0, len = tokens.length; i < len; i++) {

    tok = tokens[i];
    if (!(tok && tok.token.type === 4 && tok.token.value === 'import'))
      continue;

    tok = tokens[i + 1];
    if (!(tok && tok.token.type === 3 && tok.token.value === 'macros'))
      continue;

    tok = tokens[i + 2];
    if (!(tok && tok.token.type === 3 && tok.token.value === 'from'))
      continue;

    tok = mod = tokens[i + 3];
    if (!(tok && tok.token.type === 8))
      continue;

    mods.push(mod.token.value);
  }
  return mods;
}

require.extensions['.sjs'] = function(module, filename) {
  var buffer = fs.readFileSync(filename, 'utf8');
  var modules = extractMacroIncludes(buffer)
      .map(function(include) {
        var fname = resolve(include, {basedir: path.dirname(filename)});
        if (CACHE[fname] === undefined)
          CACHE[fname] = sweet.loadModule(fs.readFileSync(fname, 'utf8'));
        return CACHE[fname];
      })

  modules.unshift(eliminateIncludeMacros);

  var source = sweet.compile(buffer, {
    modules: modules,
    filename: filename
  }).code;

  module._compile(source, filename);
};
