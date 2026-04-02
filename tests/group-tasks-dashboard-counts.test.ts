import { describe, it, expect } from 'vitest'
import { buildGroupTaskCounts } from '../src/modules/tasks/queries'

describe('group tasks dashboard counts', () => {
  it('open excludes done and cancelled', () => {
    const { counts } = buildGroupTaskCounts([
      { company_id: 'c1', status: 'todo' },
      { company_id: 'c1', status: 'in_progress' },
      { company_id: 'c1', status: 'done' },
      { company_id: 'c1', status: 'cancelled' },
    ])
    expect(counts.open).toBe(2)
    expect(counts.done).toBe(1)
    expect(counts.total_non_cancelled).toBe(3)
  })

  it('builds per-company stats independent from upcoming limit', () => {
    const { by_company } = buildGroupTaskCounts([
      { company_id: 'c1', status: 'in_progress' },
      { company_id: 'c1', status: 'in_progress' },
      { company_id: 'c2', status: 'todo' },
      { company_id: null, status: 'todo' },
      { company_id: 'c2', status: 'done' },
    ])
    expect(by_company.c1.in_progress).toBe(2)
    expect(by_company.c2.open).toBe(1)
    expect(by_company.__global__.todo).toBe(1)
  })
})
