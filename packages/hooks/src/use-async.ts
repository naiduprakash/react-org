import {
  Reducer,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";

import useDebounce from "./use-debounce";

type Action = {
  type: string;
  payload?: any;
};

type State = {
  status?: string;
  data?: any;
  error?: any;
  isIdle?: boolean;
  isPending?: boolean;
  isComplete?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  isReset?: boolean;
  cancel?: Function; // __TODO__: update with proper fn type
  debounceExecute?: Function; // __TODO__: update with proper fn type
  execute?: Function; // __TODO__: update with proper fn type
  reset?: Function; // __TODO__: update with proper fn type
  setQueryData?: Function; // __TODO__: update with proper fn type
};

type Config = {
  intialState?: State;
  enabled?: boolean;
  immediate?: boolean;
  infinite?: boolean;
  overwrite?: boolean;
  select?: Function;
  onError?: Function;
  onSuccess?: Function;
  onStart?: Function;
  onComplete?: Function;
  debounceTime?: number;
};

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

const INITIAL_STATE: State = {
  status: ASYNC_STATUS.IDLE,
  data: null,
  error: null,
  isIdle: true,
  isPending: false,
  isComplete: false,
  isSuccess: false,
  isError: false,
  isReset: false,
};

function handleActionStart(state: State, action: Action) {
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

function handleActionSuccess(state: State, action: Action) {
  const { data: _data, infinite, overwrite, paginate } = action.payload;
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

function handleActionError(state = {}, action: Action) {
  return { ...state, status: ASYNC_STATUS.ERROR, error: action.payload };
}
function handleActionComplete(state = {}, action: Action) {
  return { ...state, isComplete: true };
}
function handleActionReset(state = {}, action: Action) {
  return { ...state, ...INITIAL_STATE, isComplete: false, isReset: true };
}
function handleActionSetData(state = {}, action: Action) {
  return { ...state, data: action.payload };
}

const asyncReducer: Reducer<State, Action> = (
  state = INITIAL_STATE,
  action: Action
) => {
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
};

export default function useAsync(
  asyncFunction: Function,
  defaultConfig: Config = {}
) {
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

  const abortControllerRef = useRef<AbortController | null>(null);

  const [state, dispatch] = useReducer(
    asyncReducer,
    Object.assign({}, INITIAL_STATE, intialState)
  );

  const handleSetQueryData = useCallback((_data: any) => {
    dispatch({
      type: ACTION_TYPES.SET_DATA,
      payload: _data,
    });
  }, []);

  const handleExecute = useCallback(
    (args: any = {}, config: Config = {}) => {
      (async () => {
        dispatch({
          type: ACTION_TYPES.START,
          payload: { overwrite: config.overwrite },
        });
        abortControllerRef.current = new AbortController();
        const _onStart = config?.onStart || onStart;

        await _onStart();
        asyncFunction({ ...args, signal: abortControllerRef.current.signal })
          .then(async (res: any) => {
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
          .catch(async (err: any) => {
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

  const handleDebounceExecute = useDebounce(handleExecute, debounceTime, [
    handleExecute,
    debounceTime,
  ]);

  const handleReset = useCallback(() => {
    dispatch({ type: ACTION_TYPES.RESET });
  }, []);

  const handleCancel = useCallback(() => {
    abortControllerRef?.current?.abort?.();
  }, []);

  useEffect(() => {
    if (
      !ignoreRef.current &&
      state.status === ASYNC_STATUS.IDLE &&
      immediate &&
      enabled
    ) {
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
  }, [
    state,
    handleExecute,
    handleDebounceExecute,
    handleSetQueryData,
    handleReset,
    handleCancel,
  ]);
}
