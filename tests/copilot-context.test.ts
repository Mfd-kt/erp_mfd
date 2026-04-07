import { describe, expect, it } from 'vitest'
import { scoreMemoryItems } from '@/features/copilot/context'
import type { CopilotMemoryItemRow } from '@/features/copilot/types'

function mockItem(overrides: Partial<CopilotMemoryItemRow>): CopilotMemoryItemRow {
  return {
    id: '1',
    user_id: 'u',
    memory_type: 'preference',
    key: 'k',
    value_json: { note: 'test' },
    confidence_score: 0.8,
    source_count: 2,
    first_seen_at: new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

describe('scoreMemoryItems', () => {
  it('priorise les entrées dont le texte chevauche la requête', () => {
    const items = [
      mockItem({ id: 'a', key: 'tresorerie', value_json: { text: 'focus cash' } }),
      mockItem({ id: 'b', key: 'autre', value_json: { text: 'sport' } }),
    ]
    const scored = scoreMemoryItems('tresorerie et cash', items).sort((x, y) => y.score - x.score)
    expect(scored[0]?.item.id).toBe('a')
  })
})
