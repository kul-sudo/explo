import type { VolumesListProps } from '@/types/types'

const findRemovedVolumes = (
  oldVolumes: VolumesListProps,
  newVolumes: VolumesListProps
): Set<string> => {
  const removedVolumes = new Set(
    oldVolumes.map(oldVolume => oldVolume.mountpoint)
  )

  for (const newVolume of newVolumes) {
    removedVolumes.delete(newVolume.mountpoint)
  }

  return removedVolumes
}

export { findRemovedVolumes }
