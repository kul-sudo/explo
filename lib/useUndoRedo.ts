import type { UndoRedoObjectProps, ActionObjectProps } from '@/types/types'
import type { PrimitiveAtom } from 'jotai'
import type { Reducer } from 'react'
import { useReducerAtom } from 'jotai/utils'

const enum ActionTypes {
  SET_STATE,
  UNDO,
  REDO,
  REMOVE_ALL_HISTORY
}

const reducerWithUndoRedo: Reducer<UndoRedoObjectProps, ActionObjectProps> = (state, action) => {
  switch (action.type) {
    case ActionTypes.SET_STATE:
      return {
        ...state,
        past: [...state.past, state.present],
        present: action.data!,
        future: []
      }
    case ActionTypes.UNDO:
      return {
        ...state,
        past: state.past.slice(0, -1),
        present: state.past[state.past.length - 1],
        future: [state.present, ...state.future]
      }
    case ActionTypes.REDO:
      return {
        ...state,
        past: [...state.past, state.present],
        present: state.future[0],
        future: state.future.slice(1)
      }
    case ActionTypes.REMOVE_ALL_HISTORY:
      return {
        past: [],
        present: '',
        future: []
      }
    default:
      throw new Error()
  }
}

const useUndoRedo = (atom: PrimitiveAtom<UndoRedoObjectProps>) => {
  const [state, dispatch] = useReducerAtom(atom, reducerWithUndoRedo)

  const { past, present, future } = state
  
  return {
    state: present,
    setState: (newState: string) => dispatch({ type: ActionTypes.SET_STATE, data: newState }),
    undo: () => dispatch({ type: ActionTypes.UNDO }),
    redo: () => dispatch({ type: ActionTypes.REDO }),
    removeAllHistory: () => dispatch({ type: ActionTypes.REMOVE_ALL_HISTORY }),
    pastStates: past,
    futureStates: future,
    isUndoPossible: past.length > 0,
    isRedoPossible: future.length > 0
  }
}

export default useUndoRedo
