import type { UndoRedoObjectProps, ActionObjectProps } from '@/types/types'
import { useReducerAtom } from 'jotai/utils'
import { PrimitiveAtom } from 'jotai'

const enum ActionTypes {
  SET_STATE,
  UNDO,
  REDO
}

const reducerWithUndoRedo = (state: UndoRedoObjectProps, action: ActionObjectProps) => {
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

const useUndoRedo = (atom: PrimitiveAtom<UndoRedoObjectProps>) => {
  const [state, dispatch] = useReducerAtom(atom, reducerWithUndoRedo)

  const setState = (newState: string) => dispatch({ type: ActionTypes.SET_STATE, data: newState })
  const undo = () => dispatch({ type: ActionTypes.UNDO })
  const redo = () => dispatch({ type: ActionTypes.REDO })

  const { past, present, future } = state
  
  const isUndoPossible = past.length > 0
  const isRedoPossible = future.length > 0

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
