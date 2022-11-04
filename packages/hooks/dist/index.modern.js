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
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}

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

var _excluded = ["data", "infinite", "overwrite"];
var FUNCTION_PLACEHOLDER = function FUNCTION_PLACEHOLDER() {};
var ASYNC_STATUS = {
  IDLE: "idle",
  PENDING: "pending",
  SUCCESS: "success",
  ERROR: "error"
};
var ACTION_TYPES = {
  START: "start",
  SUCCESS: "success",
  ERROR: "error",
  COMPLETE: "complete",
  RESET: "reset",
  SET_DATA: "set-data"
};
var API_CANCELED_ERROR = "canceled";
var INITIAL_STATE = {
  isReset: false,
  isComplete: false,
  status: ASYNC_STATUS.IDLE,
  data: null,
  error: null
};
function asyncReducer(state, action) {
  if (state === void 0) {
    state = INITIAL_STATE;
  }
  if (action === void 0) {
    action = {};
  }
  var _action = action,
    type = _action.type,
    payload = _action.payload;
  switch (type) {
    case ACTION_TYPES.START:
      {
        var updatedState = _extends({}, state, {
          status: ASYNC_STATUS.PENDING,
          isComplete: false
        });
        if (payload.overwrite) {
          updatedState.data = [];
        }
        return updatedState;
      }
    case ACTION_TYPES.SUCCESS:
      {
        var _data = payload.data,
          infinite = payload.infinite,
          overwrite = payload.overwrite,
          rest = _objectWithoutPropertiesLoose(payload, _excluded);
        var data;
        if (infinite) {
          if (overwrite) {
            data = _data;
          } else {
            var _state;
            data = [].concat(((_state = state) === null || _state === void 0 ? void 0 : _state.data) || [], _data);
          }
        } else {
          data = payload;
        }
        return _extends({}, state, {
          status: ASYNC_STATUS.SUCCESS,
          data: data,
          restMeta: rest
        });
      }
    case ACTION_TYPES.ERROR:
      {
        return _extends({}, state, {
          status: ASYNC_STATUS.ERROR,
          error: payload
        });
      }
    case ACTION_TYPES.COMPLETE:
      {
        return _extends({}, state, {
          isComplete: true
        });
      }
    case ACTION_TYPES.RESET:
      {
        return _extends({}, state, INITIAL_STATE, {
          isComplete: false,
          isReset: true
        });
      }
    case ACTION_TYPES.SET_DATA:
      {
        return _extends({}, state, {
          data: payload
        });
      }
    default:
      {
        throw new Error("Action " + type + " is not handled in asyncReducer");
      }
  }
}
function useAsync(asyncFunction, _config) {
  if (_config === void 0) {
    _config = {};
  }
  var _config2 = _config,
    _config2$intialState = _config2.intialState,
    intialState = _config2$intialState === void 0 ? {} : _config2$intialState,
    _config2$enabled = _config2.enabled,
    enabled = _config2$enabled === void 0 ? true : _config2$enabled,
    _config2$immediate = _config2.immediate,
    immediate = _config2$immediate === void 0 ? true : _config2$immediate,
    _config2$infinite = _config2.infinite,
    infinite = _config2$infinite === void 0 ? false : _config2$infinite,
    select = _config2.select,
    _config2$onError = _config2.onError,
    onError = _config2$onError === void 0 ? FUNCTION_PLACEHOLDER : _config2$onError,
    _config2$onSuccess = _config2.onSuccess,
    onSuccess = _config2$onSuccess === void 0 ? FUNCTION_PLACEHOLDER : _config2$onSuccess,
    _config2$onStart = _config2.onStart,
    onStart = _config2$onStart === void 0 ? FUNCTION_PLACEHOLDER : _config2$onStart,
    _config2$onComplete = _config2.onComplete,
    onComplete = _config2$onComplete === void 0 ? FUNCTION_PLACEHOLDER : _config2$onComplete,
    _config2$debounceTime = _config2.debounceTime,
    debounceTime = _config2$debounceTime === void 0 ? 200 : _config2$debounceTime;

  var ignoreRef = useRef(false);
  var abortControllerRef = useRef(null);
  var _useReducer = useReducer(asyncReducer, Object.assign({}, INITIAL_STATE, intialState)),
    _useReducer$ = _useReducer[0],
    isReset = _useReducer$.isReset,
    isComplete = _useReducer$.isComplete,
    status = _useReducer$.status,
    data = _useReducer$.data,
    error = _useReducer$.error,
    _useReducer$$restMeta = _useReducer$.restMeta,
    restMeta = _useReducer$$restMeta === void 0 ? {} : _useReducer$$restMeta,
    dispatch = _useReducer[1];
  var setQueryData = useCallback(function (_data) {
    dispatch({
      type: ACTION_TYPES.SET_DATA,
      payload: _data
    });
  }, []);
  var execute = useCallback(function (args, config) {
    if (args === void 0) {
      args = {};
    }
    if (config === void 0) {
      config = {};
    }
    try {
      var _config3;
      dispatch({
        type: ACTION_TYPES.START,
        payload: {
          overwrite: config.overwrite
        }
      });
      abortControllerRef.current = new AbortController();
      var _onStart = ((_config3 = config) === null || _config3 === void 0 ? void 0 : _config3.onStart) || onStart;
      return Promise.resolve(_onStart()).then(function () {
        asyncFunction(_extends({}, args, {
          signal: abortControllerRef.current.signal
        })).then(function (res) {
          try {
            var _config4;
            var payload;
            if (select) {
              payload = select(res);
            } else if (infinite) {
              var _res$data, _res$data2;
              payload = {
                data: res === null || res === void 0 ? void 0 : (_res$data = res.data) === null || _res$data === void 0 ? void 0 : _res$data.data,
                paginate: res === null || res === void 0 ? void 0 : (_res$data2 = res.data) === null || _res$data2 === void 0 ? void 0 : _res$data2.paginate
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
            var _onSuccess = ((_config4 = config) === null || _config4 === void 0 ? void 0 : _config4.onSuccess) || onSuccess;
            return Promise.resolve(_onSuccess(payload)).then(function () {});
          } catch (e) {
            return Promise.reject(e);
          }
        })["catch"](function (err) {
          try {
            var _config5;
            if (err.message === API_CANCELED_ERROR) return Promise.resolve();
            dispatch({
              type: ACTION_TYPES.ERROR,
              payload: (err === null || err === void 0 ? void 0 : err.response) || err
            });
            var _onError = ((_config5 = config) === null || _config5 === void 0 ? void 0 : _config5.onError) || onError;
            return Promise.resolve(_onError(err)).then(function () {});
          } catch (e) {
            return Promise.reject(e);
          }
        })["finally"](function () {
          try {
            var _config6;
            dispatch({
              type: ACTION_TYPES.COMPLETE
            });
            var _onComplete = ((_config6 = config) === null || _config6 === void 0 ? void 0 : _config6.onComplete) || onComplete;
            return Promise.resolve(_onComplete()).then(function () {});
          } catch (e) {
            return Promise.reject(e);
          }
        });
      });
    } catch (e) {
      Promise.reject(e);
    }
  }, [asyncFunction, infinite, onComplete, onError, onStart, onSuccess, select]);
  var debounceExecute = useDebounce(execute, debounceTime, [execute, debounceTime]);
  var reset = useCallback(function () {
    dispatch({
      type: ACTION_TYPES.RESET
    });
  }, []);
  var cancel = useCallback(function () {
    var _abortControllerRef$c, _abortControllerRef$c2;
    abortControllerRef === null || abortControllerRef === void 0 ? void 0 : (_abortControllerRef$c = abortControllerRef.current) === null || _abortControllerRef$c === void 0 ? void 0 : (_abortControllerRef$c2 = _abortControllerRef$c.abort) === null || _abortControllerRef$c2 === void 0 ? void 0 : _abortControllerRef$c2.call(_abortControllerRef$c);
  }, []);
  useEffect(function () {
    if (!ignoreRef.current && status === ASYNC_STATUS.IDLE && immediate && enabled) {
      execute();
    }
    return function () {
      ignoreRef.current = true;
    };
  }, [enabled, execute, immediate, status]);
  return useMemo(function () {
    var values = {};
    Object.keys(restMeta).forEach(function (key) {
      values[key] = restMeta[key];
    });
    return _extends({}, values, {
      data: data,
      execute: execute,
      debounceExecute: debounceExecute,
      setQueryData: setQueryData,
      error: error,
      status: status,
      isReset: isReset,
      isComplete: isComplete,
      reset: reset,
      isIdle: status === ASYNC_STATUS.IDLE,
      isPending: status === ASYNC_STATUS.PENDING,
      isError: status === ASYNC_STATUS.ERROR,
      isSuccess: status === ASYNC_STATUS.SUCCESS,
      cancel: cancel
    });
  }, [cancel, data, debounceExecute, error, execute, isComplete, isReset, reset, restMeta, setQueryData, status]);
}

export { useAsync, useDebounce };
//# sourceMappingURL=index.modern.js.map
