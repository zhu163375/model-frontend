export const FOLLOW_RATIO_MIN = 1
export const FOLLOW_RATIO_MAX = 50

export function normalizeFollowRatio(ratio) {
  if (typeof ratio !== 'number' || Number.isNaN(ratio)) return null
  const rounded = Math.round(ratio)
  if (rounded < FOLLOW_RATIO_MIN || rounded > FOLLOW_RATIO_MAX) return null
  return rounded
}

export function isValidFollowRatio(ratio) {
  return normalizeFollowRatio(ratio) === ratio
}
