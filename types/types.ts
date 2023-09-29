import type { CSSProperties } from 'react'

type FolderReferencesProps = {
  name: 'Desktop' | 'Home' | 'Documents' | 'Downloads' | 'Pictures' | 'Music' | 'Videos'
  directory: () => Promise<string>
}[]

// [isFolder, name, path, extension]
type AddEventProps = [boolean, string, string, string]

type RowProps = {
  data: AddEventProps[]
  index: number
  style: CSSProperties
}

type VolumesListProps = {
  is_removable: boolean
  kind: 'HDD' | 'SSD'
  mountpoint: string
  available_gb: number
  used_gb: number
  total_gb: number
}[]

type UndoRedoObjectProps = {
  past: string[]
  present: string
  future: string[]
}

type ActionObjectProps = {
  type: 0 | 1 | 2
  data?: string
}

type LastTimeProps = {
  launched: number
  found: number
}

type SearchingModeValue = 0 | 1 | 2

export type {
  FolderReferencesProps,
  AddEventProps,
  RowProps,
  VolumesListProps,
  UndoRedoObjectProps,
  ActionObjectProps,
  LastTimeProps,
  SearchingModeValue
}
