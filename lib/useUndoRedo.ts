import { Reducer, useReducer } from 'react'

const SET_STATE = 'SET_STATE'
const UNDO = 'UNDO'
const REDO = 'REDO'

type UndoRedoObject = {
  past: string[],
  present: string,
  future: string[]
}

type ActionObject = {
  type: string,
  data?: string
}

const reducerWithUndoRedo: Reducer<UndoRedoObject, ActionObject> = (state, action) => {
  const { past, present, future } = state

  switch (action.type) {
    case SET_STATE:
      return {
        past: [...past, present],
        present: action.data!,
        future: []
      }
    case UNDO:
      return {
        past: past.slice(0, past.length - 1),
        present: past[past.length - 1],
        future: [present, ...future]
      }
    case REDO:
      return {
        past: [...past, present],
        present: future[0],
        future: future.slice(1)
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

  const { past, present, future } = state

  const setState = (newState: string) => dispatch({ type: SET_STATE, data: newState })
  const undo = () => dispatch({ type: UNDO })
  const redo = () => dispatch({ type: REDO })
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
