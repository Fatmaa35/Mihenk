// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SegmentedTabs } from './SegmentedTabs'

afterEach(cleanup)

describe('SegmentedTabs', () => {
  it('marks the selected tab and moves with arrow keys', () => {
    const onChange = vi.fn()
    render(
      <SegmentedTabs
        label="Raflar"
        value="reading"
        onChange={onChange}
        options={[{ value: 'reading', label: 'Okuyorum', count: 2 }, { value: 'read', label: 'Okudum' }]}
      />,
    )
    const selected = screen.getByRole('tab', { selected: true })
    expect(selected.textContent).toContain('Okuyorum')
    expect(selected.getAttribute('tabindex')).toBe('0')
    fireEvent.keyDown(selected, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('read')
  })
})
