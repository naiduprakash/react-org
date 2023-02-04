import { useCallback } from 'react';

function debounce(func, wait, immediate) {
  let timeout = null;
  return function () {
    const context = this;
    const args = arguments;
    const later = function later() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    timeout && clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}

function useDebounce(fn, time, dependencies) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(debounce(fn, time), dependencies);
}

export { useDebounce as default };
//# sourceMappingURL=use-debounce.modern.mjs.map
