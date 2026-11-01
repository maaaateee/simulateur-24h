import { describe, expect, it } from 'vitest'
import { poserRepos } from './conges'
import { contingents } from './contingents'
import { cycle24h } from './cycle24'
import { tds12h } from './tds12'

describe('contingents de repos', () => {
  it('12 h : 30 jours de CP décomptés (repos du milieu compris), RTT en heures, RF', () => {
    const { planning, bilan } = poserRepos(tds12h(), '12h', 2026)
    const [cp, rtt, rf] = contingents('12h', planning, bilan)
    expect(cp).toMatchObject({ droit: 30, pris: 30 })
    expect(rtt.droit).toBe(77)
    expect(rtt.pris).toBe(bilan.rtt.vacations * 12)
    expect(rf).toMatchObject({ droit: 12, pris: bilan.rf.vacations })
  })

  it('24 h : tout le contingent est posé, et le posé suit les changements faits à la main', () => {
    const { planning, bilan } = poserRepos(cycle24h(2026, 0), '24h', 2026)
    const [cp, rtt, rf] = contingents('24h', planning, bilan)
    expect(cp.pris).toBe(cp.droit)
    expect(rtt.pris).toBe(rtt.droit)
    expect(rf).toMatchObject({ droit: 3, pris: 3 })
    const unCp = Object.keys(planning).find((d) => planning[d] === 'CP')!
    expect(contingents('24h', { ...planning, [unCp]: 'V24' }, bilan)[0].pris).toBe(cp.droit - 1)
  })
})
