import { z } from 'zod'

export const PlanSchema = z.object({
  target_date: z.string().date(),
  reminder_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  timezone: z.string().min(3),
  excluded_weekdays: z.array(z.number().int().min(0).max(6)),
  delivery_channel: z.enum(['in_app', 'email', 'push'])
})
