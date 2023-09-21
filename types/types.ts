import type { CSSProperties } from 'react'

type FolderReferencesProps = {
  name: 'Desktop' | 'Home' | 'Documents' | 'Downloads' | 'Pictures' | 'Music' | 'Videos'
  directory: () => Promise<string>
}[]

type AddEventProps = {
  isFolder: boolean
  name: string
  path: string
  extension: string
}

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

type UndoRedoObject = {
  past: string[]
  present: string
  future: string[]
}

type ActionObject = {
  type: 0 | 1 | 2
  data?: string
}

export type {
  FolderReferencesProps,
  AddEventProps,
  RowProps,
  VolumesListProps,
  UndoRedoObject,
  ActionObject
}
