import { z } from 'zod'
import type { AddEventProps, VolumesListProps } from '@/types/types'
import type { ZodType } from 'zod'

export const VolumesSchema: ZodType<VolumesListProps> = z.array(
  z.object({
    is_removable: z.boolean(),
    kind: z.literal('HDD').or(z.literal('SSD')),
    mountpoint: z.string(),
    available_gb: z.number(),
    used_gb: z.number(),
    total_gb: z.number()
  })
)

export const AddSchema: ZodType<AddEventProps> = z.object({
  is_folder: z.boolean(),
  name: z.string(),
  path: z.string(),
  extension: z.string()
})
