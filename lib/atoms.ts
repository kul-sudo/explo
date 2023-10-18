import type {
  AddEventProps,
  LastTimeProps,
  SearchingModeValue,
  UndoRedoObjectProps,
  VolumesListProps
} from '@/types/types'
import { atom } from 'jotai'

const volumesListAtom = atom<VolumesListProps>([])
const readDirArrayAtom = atom<AddEventProps[]>([])
const searchingInDirectoryAtom = atom<string>('')
const isSearchingAtom = atom<boolean>(false)
const isLoadingAtom = atom<boolean>(false)
const isIncludeHiddenFoldersCheckedAtom = atom<boolean>(false)
const isIncludeFileExtensionCheckedAtom = atom<boolean>(false)
const isSortFromFoldersToFilesCheckedAtom = atom<boolean>(true)
const searchingModeAtom = atom<SearchingModeValue>(0)
const lastTimeAtom = atom<LastTimeProps>({
  launched: 0,
  found: 0
})
const currentDirectoryAtom = atom<UndoRedoObjectProps>({
  past: [],
  present: '',
  future: []
})

export {
  volumesListAtom,
  readDirArrayAtom,
  searchingInDirectoryAtom,
  isSearchingAtom,
  isLoadingAtom,
  isIncludeHiddenFoldersCheckedAtom,
  isIncludeFileExtensionCheckedAtom,
  isSortFromFoldersToFilesCheckedAtom,
  searchingModeAtom,
  lastTimeAtom,
  currentDirectoryAtom
}
