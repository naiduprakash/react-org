import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import useDebounce from "./use-debounce";

const FUNCTION_PLACEHOLDER = () => {};

const ASYNC_STATUS = {
  IDLE: "idle",
  PENDING: "pending",
  SUCCESS: "success",
  ERROR: "error",
};

const ACTION_TYPES = {
  START: "start",
  SUCCESS: "success",
  ERROR: "error",
  COMPLETE: "complete",
  RESET: "reset",
  SET_DATA: "set-data",
};

const API_CANCELED_ERROR = "canceled";

const INITIAL_STATE = {
  isReset: false,
  isComplete: false,
  status: ASYNC_STATUS.IDLE,
  data: null,
  error: null,
};

function handleActionStart(state = {}, action) {
  const updatedState = {
    ...state,
    status: ASYNC_STATUS.PENDING,
    isComplete: false,
  };
  if (action.payload.overwrite) {
    updatedState.data = [];
  }
  return updatedState;
}

function handleActionSuccess(state = {}, action) {
  const { data: _data = [], infinite, overwrite, paginate } = action.payload;
  let data;
  if (infinite) {
    data = overwrite ? _data : [...(state.data || []), ..._data];
  } else {
    data = action.payload;
  }
  return {
    ...state,
    status: ASYNC_STATUS.SUCCESS,
    data: data,
    paginate: paginate,
  };
}

function handleActionError(state = {}, action) {
  return { ...state, status: ASYNC_STATUS.ERROR, error: action.payload };
}
function handleActionComplete(state = {}, action) {
  return { ...state, isComplete: true };
}
function handleActionReset(state = {}, action) {
  return { ...state, ...INITIAL_STATE, isComplete: false, isReset: true };
}
function handleActionSetData(state, action) {
  return { ...state, data: action.payload };
}

function asyncReducer(state = INITIAL_STATE, action = {}) {
  switch (action.type) {
    case ACTION_TYPES.START: {
      return handleActionStart(state, action);
    }
    case ACTION_TYPES.SUCCESS: {
      return handleActionSuccess(state, action);
    }
    case ACTION_TYPES.ERROR: {
      return handleActionError(state, action);
    }
    case ACTION_TYPES.COMPLETE: {
      return handleActionComplete(state, action);
    }
    case ACTION_TYPES.RESET: {
      return handleActionReset(state, action);
    }
    case ACTION_TYPES.SET_DATA: {
      return handleActionSetData(state, action);
    }
    default: {
      throw new Error(`Action ${action.type} is not handled in asyncReducer`);
    }
  }
}

export default function useAsync(asyncFunction, defaultConfig = {}) {
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
    debounceTime = 200,
  } = defaultConfig;

  // Note: required for React.Strictmode to work
  const ignoreRef = useRef(false);

  const abortControllerRef = useRef(null);

  const [state, dispatch] = useReducer(asyncReducer, Object.assign({}, INITIAL_STATE, intialState));

  const handleSetQueryData = useCallback((_data) => {
    dispatch({
      type: ACTION_TYPES.SET_DATA,
      payload: _data,
    });
  }, []);

  const handleExecute = useCallback(
    (args = {}, config = {}) => {
      (async () => {
        dispatch({
          type: ACTION_TYPES.START,
          payload: { overwrite: config.overwrite },
        });
        abortControllerRef.current = new AbortController();
        const _onStart = config?.onStart || onStart;

        await _onStart();
        asyncFunction({ ...args, signal: abortControllerRef.current.signal })
          .then(async (res) => {
            let payload;
            if (select) {
              const selectRes = select(res);
              payload = {
                data: selectRes?.data,
                paginate: selectRes?.paginate,
              };
            } else if (infinite) {
              payload = {
                data: res?.data?.data,
                paginate: res?.data?.paginate,
              };
            } else {
              payload = res;
            }

            payload.overwrite = config.overwrite;
            payload.infinite = infinite;

            dispatch({ type: ACTION_TYPES.SUCCESS, payload: payload });
            const _onSuccess = config?.onSuccess || onSuccess;
            await _onSuccess(payload);
          })
          .catch(async (err) => {
            // IGNORED cancelled  error
            if (err.message === API_CANCELED_ERROR) return;

            dispatch({
              type: ACTION_TYPES.ERROR,
              payload: err?.response || err,
            });
            const _onError = config?.onError || onError;
            await _onError(err);
          })
          .finally(async () => {
            dispatch({ type: ACTION_TYPES.COMPLETE });
            const _onComplete = config?.onComplete || onComplete;
            await _onComplete();
          });
      })();
    },
    [asyncFunction, infinite, onComplete, onError, onStart, onSuccess, select]
  );

  const handleDebounceExecute = useDebounce(handleExecute, debounceTime, [handleExecute, debounceTime]);

  const handleReset = useCallback(() => {
    dispatch({ type: ACTION_TYPES.RESET });
  }, []);

  const handleCancel = useCallback(() => {
    abortControllerRef?.current?.abort?.();
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
    return {
      ...state,

      reset: handleReset,
      cancel: handleCancel,
      execute: handleExecute,
      setQueryData: handleSetQueryData,
      debounceExecute: handleDebounceExecute,

      isIdle: state.status === ASYNC_STATUS.IDLE,
      isPending: state.status === ASYNC_STATUS.PENDING,
      isError: state.status === ASYNC_STATUS.ERROR,
      isSuccess: state.status === ASYNC_STATUS.SUCCESS,
    };
  }, [state, handleExecute, handleDebounceExecute, handleSetQueryData, handleReset, handleCancel]);
}
