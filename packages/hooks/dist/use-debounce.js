var react = require('react');

function debounce(func, wait, immediate) {
  var timeout = null;
  return function () {
    var context = this;
    var args = arguments;
    var later = function later() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    timeout && clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function useDebounce(fn, time, dependencies) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return react.useCallback(debounce(fn, time), dependencies);
}

module.exports = useDebounce;
//# sourceMappingURL=use-debounce.js.map
