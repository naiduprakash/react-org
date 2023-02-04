var react = require('react');

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
  var updatedState = _extends({}, state, {
    status: ASYNC_STATUS.PENDING,
    isComplete: false
  });
  if (action.payload.overwrite) {
    updatedState.data = [];
  }
  return updatedState;
}
function handleActionSuccess(state, action) {
  var _action$payload = action.payload,
    _data = _action$payload.data,
    infinite = _action$payload.infinite,
    overwrite = _action$payload.overwrite,
    paginate = _action$payload.paginate;
  var data;
  if (infinite) {
    data = overwrite ? _data : [].concat(state.data || [], _data);
  } else {
    data = action.payload;
  }
  return _extends({}, state, {
    status: ASYNC_STATUS.SUCCESS,
    data: data,
    paginate: paginate
  });
}
function handleActionError(state, action) {
  if (state === void 0) {
    state = {};
  }
  return _extends({}, state, {
    status: ASYNC_STATUS.ERROR,
    error: action.payload
  });
}
function handleActionComplete(state, action) {
  if (state === void 0) {
    state = {};
  }
  return _extends({}, state, {
    isComplete: true
  });
}
function handleActionReset(state, action) {
  if (state === void 0) {
    state = {};
  }
  return _extends({}, state, INITIAL_STATE, {
    isComplete: false,
    isReset: true
  });
}
function handleActionSetData(state, action) {
  if (state === void 0) {
    state = {};
  }
  return _extends({}, state, {
    data: action.payload
  });
}
var asyncReducer = function asyncReducer(state, action) {
  if (state === void 0) {
    state = INITIAL_STATE;
  }
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
        throw new Error("Action " + action.type + " is not handled in asyncReducer");
      }
  }
};
function useAsync(asyncFunction, defaultConfig) {
  if (defaultConfig === void 0) {
    defaultConfig = {};
  }
  var _defaultConfig = defaultConfig,
    _defaultConfig$intial = _defaultConfig.intialState,
    intialState = _defaultConfig$intial === void 0 ? {} : _defaultConfig$intial,
    _defaultConfig$enable = _defaultConfig.enabled,
    enabled = _defaultConfig$enable === void 0 ? true : _defaultConfig$enable,
    _defaultConfig$immedi = _defaultConfig.immediate,
    immediate = _defaultConfig$immedi === void 0 ? true : _defaultConfig$immedi,
    _defaultConfig$infini = _defaultConfig.infinite,
    infinite = _defaultConfig$infini === void 0 ? false : _defaultConfig$infini,
    select = _defaultConfig.select,
    _defaultConfig$onErro = _defaultConfig.onError,
    onError = _defaultConfig$onErro === void 0 ? FUNCTION_PLACEHOLDER : _defaultConfig$onErro,
    _defaultConfig$onSucc = _defaultConfig.onSuccess,
    onSuccess = _defaultConfig$onSucc === void 0 ? FUNCTION_PLACEHOLDER : _defaultConfig$onSucc,
    _defaultConfig$onStar = _defaultConfig.onStart,
    onStart = _defaultConfig$onStar === void 0 ? FUNCTION_PLACEHOLDER : _defaultConfig$onStar,
    _defaultConfig$onComp = _defaultConfig.onComplete,
    onComplete = _defaultConfig$onComp === void 0 ? FUNCTION_PLACEHOLDER : _defaultConfig$onComp,
    _defaultConfig$deboun = _defaultConfig.debounceTime,
    debounceTime = _defaultConfig$deboun === void 0 ? 200 : _defaultConfig$deboun;
  // Note: required for React.Strictmode to work
  var ignoreRef = react.useRef(false);
  var abortControllerRef = react.useRef(null);
  var _useReducer = react.useReducer(asyncReducer, Object.assign({}, INITIAL_STATE, intialState)),
    state = _useReducer[0],
    dispatch = _useReducer[1];
  var handleSetQueryData = react.useCallback(function (_data) {
    dispatch({
      type: ACTION_TYPES.SET_DATA,
      payload: _data
    });
  }, []);
  var handleExecute = react.useCallback(function (args, config) {
    if (args === void 0) {
      args = {};
    }
    if (config === void 0) {
      config = {};
    }
    try {
      var _config;
      dispatch({
        type: ACTION_TYPES.START,
        payload: {
          overwrite: config.overwrite
        }
      });
      abortControllerRef.current = new AbortController();
      var _onStart = ((_config = config) == null ? void 0 : _config.onStart) || onStart;
      return Promise.resolve(_onStart()).then(function () {
        asyncFunction(_extends({}, args, {
          signal: abortControllerRef.current.signal
        })).then(function (res) {
          try {
            var _config2;
            var payload;
            if (select) {
              var selectRes = select(res);
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
            var _onSuccess = ((_config2 = config) == null ? void 0 : _config2.onSuccess) || onSuccess;
            return Promise.resolve(_onSuccess(payload)).then(function () {});
          } catch (e) {
            return Promise.reject(e);
          }
        })["catch"](function (err) {
          try {
            var _config3;
            // IGNORED cancelled  error
            if (err.message === API_CANCELED_ERROR) return Promise.resolve();
            dispatch({
              type: ACTION_TYPES.ERROR,
              payload: (err == null ? void 0 : err.response) || err
            });
            var _onError = ((_config3 = config) == null ? void 0 : _config3.onError) || onError;
            return Promise.resolve(_onError(err)).then(function () {});
          } catch (e) {
            return Promise.reject(e);
          }
        })["finally"](function () {
          try {
            var _config4;
            dispatch({
              type: ACTION_TYPES.COMPLETE
            });
            var _onComplete = ((_config4 = config) == null ? void 0 : _config4.onComplete) || onComplete;
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
  var handleDebounceExecute = useDebounce(handleExecute, debounceTime, [handleExecute, debounceTime]);
  var handleReset = react.useCallback(function () {
    dispatch({
      type: ACTION_TYPES.RESET
    });
  }, []);
  var handleCancel = react.useCallback(function () {
    var _abortControllerRef$c;
    abortControllerRef == null ? void 0 : (_abortControllerRef$c = abortControllerRef.current) == null ? void 0 : _abortControllerRef$c.abort == null ? void 0 : _abortControllerRef$c.abort();
  }, []);
  react.useEffect(function () {
    if (!ignoreRef.current && state.status === ASYNC_STATUS.IDLE && immediate && enabled) {
      handleExecute();
    }
    return function () {
      ignoreRef.current = true;
    };
  }, [enabled, handleExecute, immediate, state, state.status]);
  return react.useMemo(function () {
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

module.exports = useAsync;
//# sourceMappingURL=use-async.js.map
