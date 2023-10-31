import type {
  AddEventProps,
  LastTimeProps,
  SearchingModeValue,
  Settings,
  UndoRedoObjectProps,
  VolumesListProps
} from '@/types/types'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'
import constants from './consts'

export const volumesListAtom = atom<VolumesListProps>([])
export const readDirArrayAtom = atom<AddEventProps[]>([])
export const searchingInDirectoryAtom = atom<string>('')
export const isSearchingAtom = atom<boolean>(false)
export const isLoadingAtom = atom<boolean>(false)

export const isIncludeHiddenFoldersCheckedAtom = atom<boolean>(false)
export const isIncludeFileExtensionCheckedAtom = atom<boolean>(false)
export const isSortFromFoldersToFilesCheckedAtom = atom<boolean>(true)

const settings = constants.settings
export const currentSettingsAtom = atomWithStorage<Settings>('settings', {
  'Show animations': settings['Show animations'],
  'Show theme options': settings['Show theme options'],
  Fullscreen: settings.Fullscreen,
  'Show base directories': settings['Show base directories']
})

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
