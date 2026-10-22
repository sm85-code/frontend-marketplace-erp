import { describe, expect, it } from 'vitest'
import { compactTokens, turnUsage, usd } from './assistantDisplay'

describe('AI usage line', () => {
  it('formats model, tokens and cost compactly', () => {
    expect(turnUsage({ model: 'claude-sonnet-5-5', input_tokens: 3210, output_tokens: 1100, cost_usd: '0.0414', actions: [] })).toBe('Sonnet 5.5 · 3.2k/1.1k token · $0.04')
  })
  it('lists web research and photo costs', () => {
    const line = turnUsage({ model: 'gpt-6.1-sol', input_tokens: 800, output_tokens: 200, cost_usd: '0.15', actions: [{ tool: 'riset_web', result: { biaya_usd: '0.0230' } }, { tool: 'buat_gambar_produk', result: { biaya_usd: '0.1000' } }] })
    expect(line).toBe('GPT-6.1 Sol · 800/200 token · $0.15 (riset $0.02 · foto $0.10)')
  })
  it('internal commands use no tokens', () => {
    expect(turnUsage({ model: 'internal-v1', input_tokens: 0, output_tokens: 0, cost_usd: '0', actions: [] })).toBe('Internal · tanpa token')
    expect(compactTokens(999)).toBe('999'); expect(usd('0.004')).toBe('$0.004')
  })
})
