export type AddEventProps = {
  is_folder: boolean
  name: string
  path: string
  extension: string
}

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
