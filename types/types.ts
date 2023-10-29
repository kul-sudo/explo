// [isFolder, name, path, extension]
type AddEventProps = [boolean, string, string, string]

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
  type: 0 | 1 | 2 | 3 | 4
  data?: string
}

type LastTimeProps = {
  launched: number
  found: number
}

type SearchingModeValue = 0 | 1 | 2 | 3

export type {
  AddEventProps,
  VolumesListProps,
  UndoRedoObjectProps,
  ActionObjectProps,
  LastTimeProps,
  SearchingModeValue
}
