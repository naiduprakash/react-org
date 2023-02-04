import { useCallback } from "react";
import debounce from "./utils/debounce";

export default function useDebounce(fn:Function, time:number, dependencies:Array<any>) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(debounce(fn, time), dependencies);
}
