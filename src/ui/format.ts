const eur0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 })
const eur2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nb = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 })

/** « 1 234 € » */
export const euros = (n: number) => `${eur0.format(Math.round(n))} €`
/** « 1 234,56 € » */
export const euros2 = (n: number) => `${eur2.format(n)} €`
/** « +1 234 € » ou « −1 234 € » */
export const signe = (n: number) => `${n >= 0 ? '+' : '−'}${eur0.format(Math.abs(Math.round(n)))} €`
export const nombre = (n: number) => nb.format(n)
export const heures = (n: number) => `${eur0.format(Math.round(n))} h`
