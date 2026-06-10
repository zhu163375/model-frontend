export const FOLLOW_RATIO_MIN = 1
export const FOLLOW_RATIO_MAX = 50

/** 详情里跟随倍数的 6 个快捷档位（按当前上限过滤，最多显示 6 个） */
export const FOLLOW_RATIO_QUICK_PRESETS = [1, 2, 5, 10, 20, 50]

export function buildQuickRatioOptions(maxRatio) {
  if (maxRatio < FOLLOW_RATIO_MIN) return []
  return FOLLOW_RATIO_QUICK_PRESETS.filter((ratio) => ratio <= maxRatio)
}

export function normalizeFollowRatio(ratio) {
  if (typeof ratio !== 'number' || Number.isNaN(ratio)) return null
  const rounded = Math.round(ratio)
  if (rounded < FOLLOW_RATIO_MIN || rounded > FOLLOW_RATIO_MAX) return null
  return rounded
}

export function isValidFollowRatio(ratio) {
  return normalizeFollowRatio(ratio) === ratio
}
