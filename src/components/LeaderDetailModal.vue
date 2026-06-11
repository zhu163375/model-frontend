<template>
  <Teleport to="body">
    <Transition name="ld-fade">
      <div
        v-if="leader"
        class="ld-overlay"
        role="presentation"
        @click.self="emit('close')"
      >
        <div class="ld-modal" role="dialog" :aria-labelledby="titleId">
          <div class="ld-header">
            <div class="ld-header-main">
              <h3 :id="titleId" class="ld-title">{{ leader.name }}</h3>
            </div>
            <button type="button" class="ld-close" aria-label="关闭" @click="emit('close')">
              ×
            </button>
          </div>

          <div class="ld-body">
            <div class="ld-stats">
              <div class="ld-stat">
                <span class="ld-stat-label">胜率</span>
                <span :class="['ld-stat-value', winRateClass]">{{ winRateText }}</span>
              </div>
              <div class="ld-stat">
                <span class="ld-stat-label">盈利率</span>
                <span :class="['ld-stat-value', profitRateClass]">{{ profitRateText }}</span>
              </div>
              <div class="ld-stat">
                <span class="ld-stat-label">当前人数</span>
                <span class="ld-stat-value" :class="{ 'ld-stat-value--danger': leader.isFull }">
                  {{ leader.count }} / {{ leader.maxFollowers }} 人
                </span>
              </div>
            </div>

            <section class="ld-section">
              <div class="ld-section-head">
                <h4>策略介绍</h4>
                <button
                  v-if="canEditStrategy"
                  type="button"
                  class="ld-link-btn"
                  @click="emit('edit-strategy')"
                >
                  编辑
                </button>
              </div>
              <p class="ld-strategy" :class="{ 'is-empty': !leader.strategyIntro }">
                {{ leader.strategyIntro || '暂未填写策略介绍' }}
              </p>
            </section>

            <section v-if="showFollowSection" class="ld-section">
              <h4>跟随配额</h4>
              <div v-if="ratioQuota" class="ld-quota">
                <div class="ld-quota-row">
                  <span>可用余额</span>
                  <strong>{{ formatMoney(ratioQuota.availableBalance) }} 元</strong>
                </div>
                <div class="ld-quota-row">
                  <span>已用 / 总倍数</span>
                  <strong>{{ ratioQuota.usedRatio }} / {{ ratioQuota.totalRatioCap }}</strong>
                </div>
                <div class="ld-quota-bar" aria-hidden="true">
                  <div
                    class="ld-quota-bar__fill"
                    :style="{ width: `${quotaUsedPercent}%` }"
                  />
                </div>
                <p class="ld-quota-tip">每 1000 元可用 1 倍（含待审批占用）</p>
              </div>
            </section>
          </div>

          <div v-if="showFollowSection" class="ld-ratio-fixed">
            <div class="ld-ratio-head">
              <span class="ld-ratio-label">跟随倍数</span>
              <span class="ld-ratio-limit">最多 {{ maxRatio }} 倍</span>
            </div>
            <div class="ld-ratio-panel" :class="{ 'is-disabled': ratioControlsDisabled }">
              <div class="ld-ratio-stepper">
                <button
                  type="button"
                  class="ld-step-btn"
                  :disabled="ratioControlsDisabled || leader.inputRatio <= ratioMin"
                  @click="stepRatio(-1)"
                >
                  −
                </button>
                <input
                  type="number"
                  :value="leader.inputRatio"
                  step="1"
                  :min="ratioMin"
                  :max="maxRatio"
                  :disabled="ratioControlsDisabled || maxRatio < ratioMin"
                  @input="onRatioInput"
                >
                <button
                  type="button"
                  class="ld-step-btn"
                  :disabled="ratioControlsDisabled || leader.inputRatio >= maxRatio"
                  @click="stepRatio(1)"
                >
                  +
                </button>
                <span class="ld-ratio-suffix">倍</span>
              </div>
              <div class="ld-chips">
                <button
                  v-for="r in quickRatios"
                  :key="r"
                  type="button"
                  :class="[
                    'ld-chip',
                    {
                      active: leader.inputRatio === r,
                      disabled: ratioControlsDisabled || r > maxRatio,
                    },
                  ]"
                  :disabled="ratioControlsDisabled || r > maxRatio"
                  @click="emit('set-ratio', r)"
                >
                  {{ r }}x
                </button>
              </div>
            </div>
          </div>

          <div class="ld-footer">
            <div
              v-if="showFollowingAlert"
              class="ld-footer-alert ld-footer-alert--following"
              role="status"
            >
              <span class="ld-footer-alert__title">已跟随</span>
              <p class="ld-footer-alert__text">{{ followingAlertText }}</p>
            </div>
            <div
              v-else-if="showPendingAlert"
              class="ld-footer-alert ld-footer-alert--pending"
              role="status"
            >
              <span class="ld-footer-alert__title">待审批</span>
              <p class="ld-footer-alert__text">{{ pendingAlertText }}</p>
            </div>
            <div
              v-else-if="showFollowSection && followStatus?.status === 'no-funds' && followStatus?.reason"
              class="ld-footer-alert ld-footer-alert--danger"
              role="alert"
            >
              <span class="ld-footer-alert__title">资金不足</span>
              <p class="ld-footer-alert__text">{{ followStatus.reason }}</p>
            </div>
            <p
              v-else-if="showFollowSection && followStatus?.reason"
              class="ld-footer-hint"
            >
              {{ followStatus.reason }}
            </p>
            <div
              class="ld-footer-actions"
              :class="{ 'ld-footer-actions--single': !showApplyButton }"
            >
              <button type="button" class="ld-cancel-btn" @click="emit('close')">
                取消
              </button>
              <button
                v-if="showApplyButton"
                type="button"
                class="ld-apply-btn ld-apply-btn--ready"
                :disabled="actionLoading"
                @click="emit('apply')"
              >
                {{ actionLoading ? '提交中…' : '申请跟随' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  leader: { type: Object, default: null },
  canEditStrategy: { type: Boolean, default: false },
  showFollowSection: { type: Boolean, default: true },
  activeFollow: { type: Object, default: null },
  pendingRequest: { type: Object, default: null },
  ratioMin: { type: Number, required: true },
  maxRatio: { type: Number, required: true },
  quickRatios: { type: Array, default: () => [] },
  ratioQuota: { type: Object, default: null },
  followStatus: { type: Object, default: null },
  actionLoading: { type: Boolean, default: false },
  formatRate: { type: Function, required: true },
  statClass: { type: Function, required: true },
  formatMoney: { type: Function, required: true },
})

const emit = defineEmits(['close', 'apply', 'set-ratio', 'edit-strategy', 'ratio-input'])

const titleId = `ld-title-${Math.random().toString(36).slice(2, 9)}`

const winRateText = computed(() => props.formatRate(props.leader?.winRate))
const profitRateText = computed(() => props.formatRate(props.leader?.profitRate))
const winRateClass = computed(() => props.statClass(props.leader?.winRate))
const profitRateClass = computed(() => props.statClass(props.leader?.profitRate, true))

const quotaUsedPercent = computed(() => {
  const cap = props.ratioQuota?.totalRatioCap ?? 0
  const used = props.ratioQuota?.usedRatio ?? 0
  if (cap <= 0) return 0
  return Math.min(100, Math.round((used / cap) * 100))
})

const ratioControlsDisabled = computed(
  () =>
    Boolean(props.activeFollow) ||
    Boolean(props.pendingRequest) ||
    Boolean(props.followStatus?.disabled),
)

const showFollowingAlert = computed(
  () => props.showFollowSection && Boolean(props.activeFollow),
)

const showPendingAlert = computed(
  () => props.showFollowSection && Boolean(props.pendingRequest) && !props.activeFollow,
)

const showApplyButton = computed(
  () =>
    props.showFollowSection &&
    !props.activeFollow &&
    !props.pendingRequest &&
    props.followStatus?.status === 'ready',
)

const followingAlertText = computed(() => {
  const ratio = props.activeFollow?.ratio ?? props.followStatus?.followingRatio
  if (ratio != null && Number.isFinite(Number(ratio))) {
    return `当前以 ${Number(ratio)} 倍跟随该导师，可在侧边栏解除跟随`
  }
  return '当前已跟随该导师，可在侧边栏解除跟随'
})

const pendingAlertText = computed(() => {
  const ratio = props.pendingRequest?.ratio
  if (ratio != null && Number.isFinite(Number(ratio))) {
    return `已向该导师提交 ${Number(ratio)} 倍跟随申请，请等待导师审批`
  }
  return '已向该导师提交跟随申请，请等待导师审批'
})

function onRatioInput(event) {
  emit('ratio-input', event)
}

function stepRatio(delta) {
  const current = Number(props.leader?.inputRatio) || props.ratioMin
  const next = Math.min(
    props.maxRatio,
    Math.max(props.ratioMin, current + delta),
  )
  emit('set-ratio', next)
}
</script>

<style scoped>
.ld-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000001;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
}

.ld-modal {
  width: 100%;
  max-width: 520px;
  max-height: min(92vh, 720px);
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow: 0 24px 48px -16px rgba(15, 23, 42, 0.28);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ld-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.ld-header-main {
  min-width: 0;
}

.ld-title {
  margin: 0;
  font-size: 18px;
  color: #0f172a;
}

.ld-close {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 8px;
  background: #f8fafc;
  color: #64748b;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.ld-close:hover {
  background: #f1f5f9;
  color: #334155;
}

.ld-body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 16px 20px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.ld-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.ld-stat {
  padding: 12px 10px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  text-align: center;
}

.ld-stat-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: #64748b;
}

.ld-stat-value {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #334155;
}

.ld-stat-value--danger {
  color: #ef4444;
}

.ld-section + .ld-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e2e8f0;
}

.ld-section h4 {
  margin: 0 0 12px;
  font-size: 14px;
  color: #0f172a;
}

.ld-section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.ld-section-head h4 {
  margin: 0;
}

.ld-link-btn {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  font-weight: 600;
  color: #2563eb;
  cursor: pointer;
}

.ld-strategy {
  margin: 0;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.65;
  color: #334155;
  white-space: pre-wrap;
  word-break: break-word;
}

.ld-strategy.is-empty {
  color: #94a3b8;
}

.ld-quota {
  margin-bottom: 0;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.ld-quota-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: #64748b;
}

.ld-quota-row + .ld-quota-row {
  margin-top: 8px;
}

.ld-quota-row strong {
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.ld-quota-bar {
  height: 6px;
  margin-top: 12px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.ld-quota-bar__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  transition: width 0.2s ease;
}

.ld-quota-tip {
  margin: 8px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.ld-ratio-fixed {
  flex-shrink: 0;
  padding: 12px 20px;
  border-top: 1px solid #e2e8f0;
  background: #fff;
  box-shadow: 0 -4px 12px rgba(15, 23, 42, 0.06);
}

.ld-ratio-fixed .ld-ratio-head {
  margin-bottom: 10px;
}

.ld-ratio-panel {
  padding: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
}

.ld-ratio-panel.is-disabled {
  opacity: 0.72;
}

.ld-ratio-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.ld-ratio-label {
  font-size: 14px;
  font-weight: 600;
  color: #334155;
}

.ld-ratio-limit {
  font-size: 12px;
  color: #64748b;
}

.ld-ratio-stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ld-step-btn {
  width: 40px;
  height: 40px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
  color: #334155;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}

.ld-step-btn:hover:not(:disabled) {
  background: #eff6ff;
  border-color: #93c5fd;
}

.ld-step-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ld-ratio-stepper input[type='number'] {
  width: 72px;
  height: 40px;
  padding: 0 8px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 700;
  text-align: center;
}

.ld-ratio-suffix {
  font-size: 14px;
  color: #64748b;
  margin-left: 4px;
}

.ld-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}

.ld-chip {
  padding: 6px 12px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid #cbd5e1;
  background: #f1f5f9;
  color: #334155;
  cursor: pointer;
}

.ld-chip.active {
  background: #dbeafe;
  border-color: #93c5fd;
  color: #1d4ed8;
}

.ld-chip.disabled,
.ld-chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ld-footer {
  flex-shrink: 0;
  padding: 14px 20px max(20px, env(safe-area-inset-bottom));
  border-top: 1px solid #e2e8f0;
  background: #fff;
}

.ld-footer-alert {
  margin: 0 0 12px;
  padding: 12px 14px;
  border-radius: 10px;
  text-align: center;
}

.ld-footer-alert--following {
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
}

.ld-footer-alert--following .ld-footer-alert__title {
  color: #047857;
}

.ld-footer-alert--following .ld-footer-alert__text {
  color: #065f46;
}

.ld-footer-alert--pending {
  border: 1px solid #fed7aa;
  background: #fff7ed;
}

.ld-footer-alert--pending .ld-footer-alert__title {
  color: #c2410c;
}

.ld-footer-alert--pending .ld-footer-alert__text {
  color: #9a3412;
}

.ld-footer-alert--danger {
  border: 1px solid #fecaca;
  background: #fef2f2;
}

.ld-footer-alert--danger .ld-footer-alert__title {
  color: #b91c1c;
}

.ld-footer-alert--danger .ld-footer-alert__text {
  color: #991b1b;
}

.ld-footer-alert__title {
  display: block;
  margin-bottom: 6px;
  font-size: 15px;
  font-weight: 700;
}

.ld-footer-alert__text {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
}

.ld-footer-hint {
  margin: 0 0 10px;
  font-size: 13px;
  line-height: 1.5;
  color: #64748b;
  text-align: center;
}

.ld-footer-actions {
  display: flex;
  gap: 10px;
}

.ld-footer-actions--single .ld-cancel-btn {
  flex: 1;
}

/* 与 ConfirmDialog 的 confirm-btn--ghost 保持一致 */
.ld-cancel-btn {
  flex: 1;
  min-height: 40px;
  padding: 0 16px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  background: #fff;
  color: #475569;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.ld-cancel-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.ld-apply-btn {
  flex: 1;
  min-height: 48px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: background 0.15s ease;
}

.ld-apply-btn--ready {
  background: #16a34a;
}

.ld-apply-btn--ready:hover:not(:disabled) {
  background: #15803d;
}

.ld-apply-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ld-fade-enter-active,
.ld-fade-leave-active {
  transition: opacity 0.2s ease;
}

.ld-fade-enter-from,
.ld-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .ld-overlay {
    align-items: flex-end;
    padding: 0;
  }

  .ld-modal {
    width: 100%;
    max-width: 100%;
    max-height: calc(100dvh - env(safe-area-inset-bottom));
    border-radius: 14px 14px 0 0;
  }

  .ld-stats {
    grid-template-columns: 1fr;
  }

  .ld-ratio-fixed {
    padding: 12px 16px;
  }

  .ld-footer {
    padding: 0 0 max(12px, env(safe-area-inset-bottom));
  }

  .ld-footer-alert {
    margin: 10px 16px 0;
  }

  .ld-footer-hint {
    padding: 10px 16px 0;
  }

  .ld-footer-actions {
    flex-direction: column-reverse;
    gap: 10px;
    margin-top: 10px;
    padding: 0 16px 12px;
  }

  .ld-footer-actions--single {
    margin-top: 10px;
  }

  .ld-cancel-btn,
  .ld-apply-btn {
    width: 100%;
    flex: none;
    border-radius: 8px;
    min-height: 40px;
  }

  .ld-cancel-btn {
    border: 1px solid #cbd5e1;
  }
}
</style>
