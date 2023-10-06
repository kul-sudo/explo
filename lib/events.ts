import type { KeyboardEvent, RefObject } from 'react'
import type {
  AddEventProps,
  LastTimeProps,
  SearchingModeValue
} from '@/types/types'
import { invoke } from '@tauri-apps/api'
import { exists } from '@tauri-apps/api/fs'

const searchButtonOnClick = (
  currentDirectory: string,
  searchInDirectory: string,
  isIncludeHiddenFoldersChecked: boolean,
  isIncludeFileExtensionChecked: boolean,
  searchingMode: SearchingModeValue,
  setIsLoading: (newState: boolean) => void,
  setIsSearching: (newState: boolean) => void,
  setReadDirArray: (newState: AddEventProps[]) => void,
  setLastTime: (newState: LastTimeProps) => void
) => {
  setIsLoading(true)
  setIsSearching(true)
  setReadDirArray([])

  const lastTimeLaunched = Date.now()

  invoke('find_files_and_folders', {
    current_directory: currentDirectory,
    search_in_directory: searchInDirectory.toLowerCase(),
    include_hidden_folders: isIncludeHiddenFoldersChecked,
    include_file_extension: isIncludeFileExtensionChecked,
    searching_mode: searchingMode
  }).then(() => {
    setIsLoading(false)
    setIsSearching(false)

    setLastTime({
      launched: lastTimeLaunched,
      found: Date.now()
    })
  })
}

const fileOrFolderOnDoubleClick = (
  fileOrFolder: AddEventProps,
  setCurrentDirectory: (newState: string) => void
) => {
  if (fileOrFolder[0]) {
    setCurrentDirectory(fileOrFolder[2])
  } else {
    invoke('open_file_in_default_application', { fileName: fileOrFolder[2] })
  }
}

const directoryInputOnKeyDown = async (
  event: KeyboardEvent<HTMLInputElement>,
  directoryRef: RefObject<HTMLInputElement>,
  currentDirectory: string,
  setCurrentDirectory: (newState: string) => void
) => {
  if (event.key === 'Enter') {
    if (directoryRef.current) {
      if (directoryRef.current.value !== currentDirectory) {
        if (await exists(directoryRef.current.value)) {
          setCurrentDirectory(directoryRef.current.value)
        }
      }
    }
  }
}

export {
  searchButtonOnClick,
  fileOrFolderOnDoubleClick,
  directoryInputOnKeyDown
}
