import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";

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

function asyncReducer(state = INITIAL_STATE, action = {}) {
  const { type, payload } = action;
  switch (type) {
    case ACTION_TYPES.START: {
      let updatedState = {
        ...state,
        status: ASYNC_STATUS.PENDING,
        isComplete: false,
      };
      if (payload.overwrite) {
        updatedState.data = [];
      }
      return updatedState;
    }
    case ACTION_TYPES.SUCCESS: {
      let { data: _data, infinite, overwrite, ...rest } = payload;
      let data;
      if (infinite) {
        if (overwrite) {
          data = _data;
        } else {
          data = [...(state?.data || []), ..._data];
        }
      } else {
        data = payload;
      }
      return {
        ...state,
        status: ASYNC_STATUS.SUCCESS,
        data: data,
        restMeta: rest,
      };
    }
    case ACTION_TYPES.ERROR: {
      return { ...state, status: ASYNC_STATUS.ERROR, error: payload };
    }
    case ACTION_TYPES.COMPLETE: {
      return { ...state, isComplete: true };
    }
    case ACTION_TYPES.RESET: {
      return { ...state, ...INITIAL_STATE, isComplete: false, isReset: true };
    }
    case ACTION_TYPES.SET_DATA: {
      return { ...state, data: payload };
    }
    default: {
      throw new Error(`Action ${type} is not handled in asyncReducer`);
    }
  }
}

export default function useAsync(asyncFunction, _config = {}) {
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
  } = _config;

  //required for React.Strictmode to work
  const ignoreRef = useRef(false);

  const abortControllerRef = useRef(null);

  const [
    { isReset, isComplete, status, data, error, restMeta = {} },
    dispatch,
  ] = useReducer(asyncReducer, Object.assign({}, INITIAL_STATE, intialState));

  const setQueryData = useCallback((_data) => {
    dispatch({
      type: ACTION_TYPES.SET_DATA,
      payload: _data,
    });
  }, []);

  const execute = useCallback(
    (args = {}, config = {}) => {
      (async () => {
        dispatch({
          type: ACTION_TYPES.START,
          payload: { overwrite: config.overwrite },
        });
        abortControllerRef.current = new AbortController();
        let _onStart = config?.onStart || onStart;

        await _onStart();
        asyncFunction({ ...args, signal: abortControllerRef.current.signal })
          .then(async (res) => {
            let payload;
            if (select) {
              payload = select(res);
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
            let _onSuccess = config?.onSuccess || onSuccess;
            await _onSuccess(payload);
          })
          .catch(async (err) => {
            // IGNORED cancelled  error
            if (err.message === API_CANCELED_ERROR) return;

            dispatch({
              type: ACTION_TYPES.ERROR,
              payload: err?.response || err,
            });
            let _onError = config?.onError || onError;
            await _onError(err);
          })
          .finally(async () => {
            dispatch({ type: ACTION_TYPES.COMPLETE });
            let _onComplete = config?.onComplete || onComplete;
            await _onComplete();
          });
      })();
    },
    [
      asyncFunction,
      infinite,
      onComplete,
      onError,
      onStart,
      onSuccess,
      select,
      withAxiosAbort,
    ]
  );

  const debounceExecute = useDebounce(execute, debounceTime, [
    execute,
    debounceTime,
  ]);

  const reset = useCallback(() => {
    dispatch({ type: ACTION_TYPES.RESET });
  }, []);

  const cancel = useCallback(() => {
    abortControllerRef?.current?.abort?.();
  }, []);

  useEffect(() => {
    if (
      !ignoreRef.current &&
      status === ASYNC_STATUS.IDLE &&
      immediate &&
      enabled
    ) {
      execute();
    }
    return () => {
      ignoreRef.current = true;
    };
  }, [enabled, execute, immediate, status]);

  return useMemo(() => {
    let values = {};

    Object.keys(restMeta).forEach((key) => {
      values[key] = restMeta[key];
    });

    return {
      ...values,
      data,
      execute,
      debounceExecute,
      setQueryData,
      error,
      status,
      isReset,
      isComplete,
      reset,
      isIdle: status === ASYNC_STATUS.IDLE,
      isPending: status === ASYNC_STATUS.PENDING,
      isError: status === ASYNC_STATUS.ERROR,
      isSuccess: status === ASYNC_STATUS.SUCCESS,
      cancel,
    };
  }, [
    cancel,
    data,
    debounceExecute,
    error,
    execute,
    isComplete,
    isReset,
    reset,
    restMeta,
    setQueryData,
    status,
  ]);
}
