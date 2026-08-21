export type AdSlotPackageId = '1h' | '6h' | '1d' | '3d'

export type AdSlotPackage = {
  id: AdSlotPackageId
  label: string
  hours: number
  baseUsd: number
  pricePerHour: number
}

export const AD_SLOT_PACKAGES: AdSlotPackage[] = [
  { id: '1h', label: '1 hour', hours: 1, baseUsd: 1.5, pricePerHour: 1.5 },
  { id: '6h', label: '6 hours', hours: 6, baseUsd: 7.5, pricePerHour: 1.25 },
  { id: '1d', label: '1 day', hours: 24, baseUsd: 12, pricePerHour: 0.5 },
  { id: '3d', label: '3 days', hours: 72, baseUsd: 30, pricePerHour: 0.4166666667 },
]

export const AD_SLOT_DYNAMIC_PRICING = {
  floorPricePerHour: 1,
  ceilingPricePerHour: 10,
  step: 0.5,
}

export function getPackageById(packageId: AdSlotPackageId): AdSlotPackage {
  const packageDef = AD_SLOT_PACKAGES.find((candidate) => candidate.id === packageId)
  if (!packageDef) throw new Error(`Unknown package: ${packageId}`)
  return packageDef
}

export function getDynamicPricePerHour(occupancyRatio: number): number {
  const { floorPricePerHour, ceilingPricePerHour, step } = AD_SLOT_DYNAMIC_PRICING
  const ratio = Math.max(0, Math.min(1, occupancyRatio))
  const adjusted = (1 + ratio * 1.5) * floorPricePerHour
  const clamped = Math.min(Math.max(adjusted, floorPricePerHour), ceilingPricePerHour)
  return Math.round(clamped / step) * step
}

export function calculateAdTotalUsd(packageId: AdSlotPackageId, occupancyRatio = 0): number {
  const pkg = getPackageById(packageId)
  const dynamicRate = getDynamicPricePerHour(occupancyRatio)
  const packagePrice = Number((pkg.hours * dynamicRate).toFixed(2))
  return Number(packagePrice.toFixed(2))
}

export function parsePackageSelection(packageId: string): AdSlotPackage {
  return getPackageById(packageId as AdSlotPackageId)
}

export function formatUsd(value: number): string {
  return `${value.toFixed(2)} USDM`
}

export function getExpiryDateFromPackage(packageId: AdSlotPackageId, now = Date.now()): Date {
  const pkg = getPackageById(packageId)
  return new Date(now + pkg.hours * 60 * 60 * 1000)
}

export default {
  AD_SLOT_PACKAGES,
  AD_SLOT_DYNAMIC_PRICING,
  getPackageById,
  getDynamicPricePerHour,
  calculateAdTotalUsd,
  parsePackageSelection,
  formatUsd,
  getExpiryDateFromPackage,
}
