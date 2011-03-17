// Move for web browers
window.move = (function(){

if (typeof window.global === 'undefined')
  window.global = window;

// Module system
var modules = {};
var _require = function _require(id) {
  if (++(_require.depth) > 20)
    throw new Error('Recursive module dependencies');
  id = id.replace(/^[\/.]+/g, '');
  var module = modules[id];
  if (!module)
    throw new Error('No module with id "'+id+'"');
  if (module.block) {
    var block = module.block;
    module.block = null;
    block(module.exports, _require, module);
  }
  _require.depth--;
  return module.exports;
};
_require.depth = 0;

// %CONTENT%

var move = _require('index');
move.runtime._require = _require;

// --------------------------------------------------------------
// Loading and executing <script>s

// Called when a Move script has been compiled (or failed to compile or load)
// For a <script> tag source, `origin` is the HTMLElement instance
move.onScriptLoaded = function onScriptLoaded(err, jscode, origin) {
  if (err) throw err;
  Function(jscode)();
};

// Compilation options used for <scrip> Move code which can be customized.
move.scriptCompilationOptions = {};

// Internal (used to run all Move <script>s found)
var runScripts = function runScripts() {
  var script, i, L, scripts, jscode,
      compileOptions = move.scriptCompilationOptions,
      nextQIndex = 0, completeQ = [], pending = 0;
  var incr = function () { ++pending; }
  var decr = function () {
    if ((--pending) === 0) {
      // all loaded -- exec in order
      var i = 0, L = completeQ.length;
      for (;i<L;++i)
        move.onScriptLoaded.apply(move, completeQ[i]);
    }
  }
  scripts = document.getElementsByTagName('script');
  incr();
  for (i=0, L=scripts.length; i < L; ++i) {
    script = scripts[i];
    if (script && script.type === 'text/move') {
      (function (qIndex) {
        incr();
        if (script.src) {
          compileOptions.filename = script.src;
          move.compileURL(script.src, compileOptions, function (err, jscode) {
            completeQ[qIndex] = [err, jscode, script];
            decr();
          });
        } else {
          try {
            compileOptions.filename = '<script>';
            jscode = move.compile(script.innerHTML, compileOptions);
            completeQ[qIndex] = [null, jscode, script];
          } catch (e) {
            completeQ[qIndex] = [e, null, script];
          }
          decr();
        }
      })(nextQIndex++);
    }
  }
  decr();
  return null;
};
if (window.addEventListener) {
  addEventListener('DOMContentLoaded', runScripts, false);
} else {
  attachEvent('onload', runScripts);
}

return move;
})();
