import type { ActionObject, UndoRedoObject } from '@/types/types'
import { Reducer, useReducer } from 'react'

enum ActionTypes {
  SET_STATE,
  UNDO,
  REDO
}

const reducerWithUndoRedo: Reducer<UndoRedoObject, ActionObject> = (state, action) => {
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
    default:
      throw new Error()
  }
}

const useUndoRedo = (initialState: string) => {
  const [state, dispatch] = useReducer<Reducer<UndoRedoObject, ActionObject>>(reducerWithUndoRedo, {
    past: [],
    present: initialState,
    future: []
  })

  const { past, present, future }: { past: string[], present: string, future: string[] } = state

  const setState = (newState: string) => dispatch({ type: ActionTypes.SET_STATE, data: newState })
  const undo = () => dispatch({ type: ActionTypes.UNDO })
  const redo = () => dispatch({ type: ActionTypes.REDO })

  const isUndoPossible = past && past.length > 0
  const isRedoPossible = future && future.length > 0

  return {
    state: present,
    setState,
    undo,
    redo,
    pastStates: past,
    futureStates: future,
    isUndoPossible,
    isRedoPossible
  }
}

export default useUndoRedo
