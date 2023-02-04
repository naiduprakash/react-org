import { useCallback, useRef, useReducer, useEffect, useMemo } from 'react';

function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}

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

const FUNCTION_PLACEHOLDER = () => {};
const ASYNC_STATUS = {
  IDLE: "idle",
  PENDING: "pending",
  SUCCESS: "success",
  ERROR: "error"
};
const ACTION_TYPES = {
  START: "start",
  SUCCESS: "success",
  ERROR: "error",
  COMPLETE: "complete",
  RESET: "reset",
  SET_DATA: "set-data"
};
const API_CANCELED_ERROR = "canceled";
const INITIAL_STATE = {
  status: ASYNC_STATUS.IDLE,
  data: null,
  error: null,
  isIdle: true,
  isPending: false,
  isComplete: false,
  isSuccess: false,
  isError: false,
  isReset: false
};
function handleActionStart(state, action) {
  const updatedState = _extends({}, state, {
    status: ASYNC_STATUS.PENDING,
    isComplete: false
  });
  if (action.payload.overwrite) {
    updatedState.data = [];
  }
  return updatedState;
}
function handleActionSuccess(state, action) {
  const {
    data: _data,
    infinite,
    overwrite,
    paginate
  } = action.payload;
  let data;
  if (infinite) {
    data = overwrite ? _data : [...(state.data || []), ..._data];
  } else {
    data = action.payload;
  }
  return _extends({}, state, {
    status: ASYNC_STATUS.SUCCESS,
    data: data,
    paginate: paginate
  });
}
function handleActionError(state = {}, action) {
  return _extends({}, state, {
    status: ASYNC_STATUS.ERROR,
    error: action.payload
  });
}
function handleActionComplete(state = {}, action) {
  return _extends({}, state, {
    isComplete: true
  });
}
function handleActionReset(state = {}, action) {
  return _extends({}, state, INITIAL_STATE, {
    isComplete: false,
    isReset: true
  });
}
function handleActionSetData(state = {}, action) {
  return _extends({}, state, {
    data: action.payload
  });
}
const asyncReducer = (state = INITIAL_STATE, action) => {
  switch (action.type) {
    case ACTION_TYPES.START:
      {
        return handleActionStart(state, action);
      }
    case ACTION_TYPES.SUCCESS:
      {
        return handleActionSuccess(state, action);
      }
    case ACTION_TYPES.ERROR:
      {
        return handleActionError(state, action);
      }
    case ACTION_TYPES.COMPLETE:
      {
        return handleActionComplete(state);
      }
    case ACTION_TYPES.RESET:
      {
        return handleActionReset(state);
      }
    case ACTION_TYPES.SET_DATA:
      {
        return handleActionSetData(state, action);
      }
    default:
      {
        throw new Error(`Action ${action.type} is not handled in asyncReducer`);
      }
  }
};
function useAsync(asyncFunction, defaultConfig = {}) {
  const {
    intialState = {},
    enabled = true,
    immediate = true,
    infinite = false,
    select,
    onError = FUNCTION_PLACEHOLDER,
    onSuccess = FUNCTION_PLACEHOLDER,
    onStart = FUNCTION_PLACEHOLDER,
    onComplete = FUNCTION_PLACEHOLDER,
    debounceTime = 200
  } = defaultConfig;
  // Note: required for React.Strictmode to work
  const ignoreRef = useRef(false);
  const abortControllerRef = useRef(null);
  const [state, dispatch] = useReducer(asyncReducer, Object.assign({}, INITIAL_STATE, intialState));
  const handleSetQueryData = useCallback(_data => {
    dispatch({
      type: ACTION_TYPES.SET_DATA,
      payload: _data
    });
  }, []);
  const handleExecute = useCallback((args = {}, config = {}) => {
    (async () => {
      dispatch({
        type: ACTION_TYPES.START,
        payload: {
          overwrite: config.overwrite
        }
      });
      abortControllerRef.current = new AbortController();
      const _onStart = (config == null ? void 0 : config.onStart) || onStart;
      await _onStart();
      asyncFunction(_extends({}, args, {
        signal: abortControllerRef.current.signal
      })).then(async res => {
        let payload;
        if (select) {
          const selectRes = select(res);
          payload = {
            data: selectRes == null ? void 0 : selectRes.data,
            paginate: selectRes == null ? void 0 : selectRes.paginate
          };
        } else if (infinite) {
          var _res$data, _res$data2;
          payload = {
            data: res == null ? void 0 : (_res$data = res.data) == null ? void 0 : _res$data.data,
            paginate: res == null ? void 0 : (_res$data2 = res.data) == null ? void 0 : _res$data2.paginate
          };
        } else {
          payload = res;
        }
        payload.overwrite = config.overwrite;
        payload.infinite = infinite;
        dispatch({
          type: ACTION_TYPES.SUCCESS,
          payload: payload
        });
        const _onSuccess = (config == null ? void 0 : config.onSuccess) || onSuccess;
        await _onSuccess(payload);
      }).catch(async err => {
        // IGNORED cancelled  error
        if (err.message === API_CANCELED_ERROR) return;
        dispatch({
          type: ACTION_TYPES.ERROR,
          payload: (err == null ? void 0 : err.response) || err
        });
        const _onError = (config == null ? void 0 : config.onError) || onError;
        await _onError(err);
      }).finally(async () => {
        dispatch({
          type: ACTION_TYPES.COMPLETE
        });
        const _onComplete = (config == null ? void 0 : config.onComplete) || onComplete;
        await _onComplete();
      });
    })();
  }, [asyncFunction, infinite, onComplete, onError, onStart, onSuccess, select]);
  const handleDebounceExecute = useDebounce(handleExecute, debounceTime, [handleExecute, debounceTime]);
  const handleReset = useCallback(() => {
    dispatch({
      type: ACTION_TYPES.RESET
    });
  }, []);
  const handleCancel = useCallback(() => {
    var _abortControllerRef$c;
    abortControllerRef == null ? void 0 : (_abortControllerRef$c = abortControllerRef.current) == null ? void 0 : _abortControllerRef$c.abort == null ? void 0 : _abortControllerRef$c.abort();
  }, []);
  useEffect(() => {
    if (!ignoreRef.current && state.status === ASYNC_STATUS.IDLE && immediate && enabled) {
      handleExecute();
    }
    return () => {
      ignoreRef.current = true;
    };
  }, [enabled, handleExecute, immediate, state, state.status]);
  return useMemo(() => {
    return _extends({}, state, {
      reset: handleReset,
      cancel: handleCancel,
      execute: handleExecute,
      setQueryData: handleSetQueryData,
      debounceExecute: handleDebounceExecute,
      isIdle: state.status === ASYNC_STATUS.IDLE,
      isPending: state.status === ASYNC_STATUS.PENDING,
      isError: state.status === ASYNC_STATUS.ERROR,
      isSuccess: state.status === ASYNC_STATUS.SUCCESS
    });
  }, [state, handleExecute, handleDebounceExecute, handleSetQueryData, handleReset, handleCancel]);
}

export { useAsync as default };
//# sourceMappingURL=use-async.modern.mjs.map
