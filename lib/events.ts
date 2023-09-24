import type { AddEventProps, LastTimeProps, SearchingModeValue } from '@/types/types'
import { KeyboardEvent, RefObject } from 'react'
import { invoke } from '@tauri-apps/api'
import { exists } from '@tauri-apps/api/fs'

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

const searchButtonOnClick = (
  currentDirectory: string,
  searchInDirectory: string,
  isIncludeHiddenFoldersChecked: boolean,
  searchingMode: SearchingModeValue,
  setIsLoading: (newState: boolean) => void,
  setIsSearching: (newState: boolean) => void,
  setReadDirArray: (newState: AddEventProps[]) => void,
  setLastTime: (newState: LastTimeProps) => void,
) => {
  setIsLoading(true)
  setIsSearching(true)
  setReadDirArray([])

  const lastTimeLaunched = Date.now()

  invoke('find_files_and_folders', { current_directory: currentDirectory, search_in_directory: searchInDirectory.toLowerCase(), include_hidden_folders: isIncludeHiddenFoldersChecked, searching_mode: searchingMode }).then(() => {
    setIsLoading(false)
    setIsSearching(false)

    setLastTime({
      launched: lastTimeLaunched,
      found: Date.now()
    })
  })
}

const fileOrFolderDoubleClick = (
  fileOrFolder: AddEventProps,
  setCurrentDirectory: (newState: string) => void
) => {
  if (fileOrFolder.isFolder) {
    setCurrentDirectory(fileOrFolder.path)
  } else {
    invoke('open_file_in_default_application', { fileName: fileOrFolder.path })
  }
}

export { directoryInputOnKeyDown, searchButtonOnClick, fileOrFolderDoubleClick }
