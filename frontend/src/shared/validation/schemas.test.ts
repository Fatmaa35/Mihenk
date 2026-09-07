import { describe, expect, it } from 'vitest'
import { PlanSchema } from './schemas'

const validPlan = {
  target_date: '2026-12-31', reminder_time: '20:30', timezone: 'Europe/Istanbul',
  excluded_weekdays: [5, 6], delivery_channel: 'in_app'
}

describe('PlanSchema', () => {
  it('accepts a valid localized reading plan', () => {
    expect(PlanSchema.safeParse(validPlan).success).toBe(true)
  })

  it('rejects impossible times and weekdays', () => {
    expect(PlanSchema.safeParse({ ...validPlan, reminder_time: '25:90' }).success).toBe(false)
    expect(PlanSchema.safeParse({ ...validPlan, excluded_weekdays: [7] }).success).toBe(false)
  })

  it('restricts delivery channels to implemented choices', () => {
    expect(PlanSchema.safeParse({ ...validPlan, delivery_channel: 'sms' }).success).toBe(false)
  })
})
