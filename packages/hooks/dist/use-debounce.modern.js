import { useCallback } from 'react';

function debounce(func, wait, immediate) {
  var timeout;
  return function () {
    var context = this;
    var args = arguments;
    var later = function later() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function useDebounce(fn, time, dependencies) {
  return useCallback(debounce(fn, time), dependencies);
}

export default useDebounce;
//# sourceMappingURL=use-debounce.modern.js.map
