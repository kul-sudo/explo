import type {
  AddEventProps,
  LastTimeProps,
  SearchingModeValue,
  UndoRedoObjectProps,
  VolumesListProps
} from '@/types/types'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import { settings } from './consts'

export const volumesListAtom = atom<VolumesListProps>([])
export const readDirArrayAtom = atom<AddEventProps[]>([])
export const searchingInDirectoryAtom = atom<string>('')
export const isSearchingAtom = atom<boolean>(false)
export const isLoadingAtom = atom<boolean>(false)

export const isIncludeHiddenFoldersCheckedAtom = atom<boolean>(false)
export const isIncludeFileExtensionCheckedAtom = atom<boolean>(false)
export const isSortFromFoldersToFilesCheckedAtom = atom<boolean>(true)

export const currentSettingsAtom = atomWithStorage('settings', settings)
export const searchingStoppedAtom = atom<boolean>(false)
export const selectedEntriesAtom = atom<string[]>([])

export const searchingModeAtom = atom<SearchingModeValue>(0)
export const isLoadingVolumesAtom = atom<boolean>(true)
export const lastTimeAtom = atom<LastTimeProps>({
  launched: 0,
  found: 0
})
export const currentDirectoryAtom = atom<UndoRedoObjectProps>({
  past: [],
  present: '',
  future: []
})
