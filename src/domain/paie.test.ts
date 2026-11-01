import { describe, expect, it } from 'vitest'
import { fixeMensuel, indemniteCp, netDepuisBrut, profilParDefaut, tauxDepuisTraitement } from './paie'

describe('paie', () => {
  it('taux nominal = traitement de base ÷ 169, taux 75 % à 3 décimales (vérifié sur les fiches 2026)', () => {
    expect(tauxDepuisTraitement(2344.28)).toEqual({ t100: 13.87, t75: 10.403 })
    expect(tauxDepuisTraitement(2333.22)).toEqual({ t100: 13.81, t75: 10.358 })
    expect(tauxDepuisTraitement(2180.44)).toEqual({ t100: 12.9, t75: 9.675 })
  })

  it('partie fixe, indemnité de CP et net', () => {
    const p = { ...profilParDefaut(), traitementBase: 2344.28, anciennete: 15, autresFixes: 386.36, tauxPas: 3.5 }
    const fixe = fixeMensuel(p)
    expect(fixe.map((l) => l.montant)).toEqual([2344.28, 351.64, 70.33, 195.36, 386.36])
    expect(indemniteCp(2000)).toBe(200)
    expect(netDepuisBrut(1000, p)).toBeCloseTo(1000 * 0.786 * (1 - 1.064 * 0.035), 2)
  })
})
