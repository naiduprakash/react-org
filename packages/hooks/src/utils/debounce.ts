export default function debounce(
  func: Function,
  wait: number,
  immediate?: boolean
) {
  let timeout: null | number = null;
  return function (this: any) {
    const context = this;
    const args = arguments;
    const later = function () {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    const callNow = immediate && !timeout;
    timeout && clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
}
