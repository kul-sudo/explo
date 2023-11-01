import constants from '@/lib/consts'

// [isFolder, name, path, extension]
export type AddEventProps = [boolean, string, string, string]

export type VolumesListProps = {
  is_removable: boolean
  kind: 'HDD' | 'SSD'
  mountpoint: string
  available_gb: number
  used_gb: number
  total_gb: number
}[]

export type UndoRedoObjectProps = {
  past: string[]
  present: string
  future: string[]
}

export type ActionObjectProps = {
  type: 0 | 1 | 2 | 3 | 4
  data?: string
}

export type LastTimeProps = {
  launched: number
  found: number
}

export type SearchingModeValue = 0 | 1 | 2 | 3

export type Settings = typeof constants.settings
