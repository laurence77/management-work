import React, { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

export interface ToastActionElement {
  altText: string;
  action: () => void;
  label: string;
}

const TOAST_LIMIT = 5;
const TOAST_REMOVE_DELAY = 5000;

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

type ToasterToast = Toast & {
  action?: ToastActionElement;
};

const actionTypes = {
  ADD_TOAST: 'ADD_TOAST',
  UPDATE_TOAST: 'UPDATE_TOAST',
  DISMISS_TOAST: 'DISMISS_TOAST',
  REMOVE_TOAST: 'REMOVE_TOAST',
} as const;

let memoryState: { toasts: ToasterToast[] } = { toasts: [] };

const listeners: Array<(state: typeof memoryState) => void> = [];

function dispatch(action: any) {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      memoryState.toasts = [action.toast, ...memoryState.toasts].slice(0, TOAST_LIMIT);
      break;
    case actionTypes.UPDATE_TOAST:
      memoryState.toasts = memoryState.toasts.map((t) =>
        t.id === action.toast.id ? { ...t, ...action.toast } : t
      );
      break;
    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;
      if (toastId) {
        addToRemoveQueue(toastId);
      } else {
        memoryState.toasts = memoryState.toasts.map((t) => ({
          ...t,
          open: false,
        }));
      }
      break;
    }
    case actionTypes.REMOVE_TOAST:
      memoryState.toasts = memoryState.toasts.filter((t) => t.id !== action.toastId);
      break;
  }

  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const addToRemoveQueue = (toastId: string) => {
  if (toastTimeouts.has(toastId)) {
    return;
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId);
    dispatch({
      type: actionTypes.REMOVE_TOAST,
      toastId: toastId,
    });
  }, TOAST_REMOVE_DELAY);

  toastTimeouts.set(toastId, timeout);
};

export const reducer = (state: typeof memoryState, action: any) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST: {
      const { toastId } = action;

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      };
    }
    case actionTypes.REMOVE_TOAST:
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

export function useToast() {
  const [state, setState] = useState<typeof memoryState>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  return {
    ...state,
    toast: useCallback(
      ({ ...props }: Omit<ToasterToast, 'id'>) => {
        const id = genId();

        const update = (props: ToasterToast) =>
          dispatch({
            type: actionTypes.UPDATE_TOAST,
            toast: { ...props, id },
          });
        const dismiss = () => dispatch({ type: actionTypes.DISMISS_TOAST, toastId: id });

        dispatch({
          type: actionTypes.ADD_TOAST,
          toast: {
            ...props,
            id,
            open: true,
            onOpenChange: (open: boolean) => {
              if (!open) dismiss();
            },
          },
        });

        return {
          id: id,
          dismiss,
          update,
        };
      },
      []
    ),
    dismiss: useCallback((toastId?: string) => {
      dispatch({ type: actionTypes.DISMISS_TOAST, toastId });
    }, []),
  };
}

// Convenience functions
export const toast = {
  success: (title: string, description?: string) => {
    return useToast().toast({
      title,
      description,
      type: 'success',
    });
  },
  error: (title: string, description?: string) => {
    return useToast().toast({
      title,
      description,
      type: 'error',
    });
  },
  warning: (title: string, description?: string) => {
    return useToast().toast({
      title,
      description,
      type: 'warning',
    });
  },
  info: (title: string, description?: string) => {
    return useToast().toast({
      title,
      description,
      type: 'info',
    });
  },
};