<template>
  <div v-if="currentUser" class="system-body">
    <header>
      <div class="header-left">
        <span class="system-title">实物料跟单社区</span>
      </div>
      <div class="header-right">
        <div class="header-user-bar">
          <span class="user-display">当前登录: {{ displayName }}</span>
          <button class="btn btn-danger btn-logout" @click="handleLogout">退出注销</button>
        </div>
      </div>
    </header>

    <div v-if="pageLoading" class="page-loading">加载中...</div>

    <div v-else class="container">
      <div class="main-hall">
        <h3 class="hall-title">🏆 导师市场大厅</h3>
        <div class="table-wrapper">
          <table class="hall-table">
            <colgroup>
              <col class="col-name">
              <col class="col-stat">
              <col class="col-stat">
              <col class="col-action">
            </colgroup>
            <thead>
              <tr>
                <th class="th-name">导师名称</th>
                <th
                  class="th-stat th-sortable"
                  :class="{ 'is-sorted': hallSortKey === 'winRate' }"
                  :aria-sort="hallSortKey === 'winRate' ? (hallSortOrder === 'desc' ? 'descending' : 'ascending') : 'none'"
                  @click="toggleHallSort('winRate')"
                >
                  <span class="th-sortable-label">胜率</span>
                  <span v-if="hallSortKey === 'winRate'" class="sort-indicator" aria-hidden="true">
                    {{ hallSortOrder === 'desc' ? '↓' : '↑' }}
                  </span>
                </th>
                <th
                  class="th-stat th-sortable"
                  :class="{ 'is-sorted': hallSortKey === 'profitRate' }"
                  :aria-sort="hallSortKey === 'profitRate' ? (hallSortOrder === 'desc' ? 'descending' : 'ascending') : 'none'"
                  @click="toggleHallSort('profitRate')"
                >
                  <span class="th-sortable-label">盈利率</span>
                  <span v-if="hallSortKey === 'profitRate'" class="sort-indicator" aria-hidden="true">
                    {{ hallSortOrder === 'desc' ? '↓' : '↑' }}
                  </span>
                </th>
                <th class="th-action">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="leaders.length === 0">
                <td colspan="4" class="empty-td">暂无导师数据</td>
              </tr>
              <tr v-for="leader in sortedLeaders" :key="leader.id">
                <td class="td-name">
                  <b class="hall-leader-name">{{ leader.name }}</b>
                </td>
                <td class="td-stat">
                  <span :class="statClass(leader.winRate)">{{ formatRate(leader.winRate) }}</span>
                </td>
                <td class="td-stat">
                  <span :class="statClass(leader.profitRate, true)">{{ formatProfitRate(leader.profitRate) }}</span>
                </td>
                <td class="td-action">
                  <button
                    type="button"
                    class="btn btn-detail"
                    @click="openLeaderDetail(leader)"
                  >
                    详情
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="sidebar">
        <div v-if="!currentUser.isLeader" class="card follow-panel">
          <div v-if="ratioQuota" class="quota-widget">
            <div class="quota-widget-head">
              <span class="quota-widget-title">跟单倍数配额</span>
              <span class="quota-widget-value">
                {{ ratioQuota.usedRatio }} / {{ ratioQuota.totalRatioCap }}
              </span>
            </div>
            <div class="quota-widget-bar" aria-hidden="true">
              <div
                class="quota-widget-bar__fill"
                :style="{ width: `${quotaUsedPercent}%` }"
              />
            </div>
            <p class="quota-widget-meta">
              可用余额 <b>{{ formatMoney(ratioQuota.availableBalance) }}</b> 元 · 每 1000 元 1 倍
            </p>
          </div>

          <h3 class="follow-panel-title">我的跟随</h3>
          <div v-if="myFollows.length > 0" class="follow-cards">
            <article v-for="follow in myFollows" :key="follow.id" class="follow-card follow-card--active">
              <div class="follow-card-head">
                <span class="follow-card-name">{{ follow.traderName }}</span>
                <span class="follow-card-badge follow-card-badge--active">跟随中</span>
              </div>
              <div class="follow-card-ratio">{{ follow.ratio }}x</div>
              <p class="follow-card-hint">解除后不再跟新单；已有持仓保留，跟随导师操作或自行平仓</p>
              <button
                type="button"
                class="follow-card-btn follow-card-btn--danger"
                :disabled="actionLoading"
                @click="confirmUnfollow(follow)"
              >
                解除跟随
              </button>
            </article>
          </div>
          <div v-else class="empty-text">暂无已生效的跟随</div>

          <template v-if="myPendingRequests.length > 0">
            <h3 class="follow-panel-subtitle">待审批 ({{ myPendingRequests.length }})</h3>
            <div class="follow-cards">
              <article v-for="req in myPendingRequests" :key="req.id" class="follow-card follow-card--pending">
                <div class="follow-card-head">
                  <span class="follow-card-name">{{ req.traderName }}</span>
                  <span class="follow-card-badge follow-card-badge--pending">待审批</span>
                </div>
                <div class="follow-card-ratio">{{ req.ratio }}x</div>
                <p class="follow-card-hint">等待导师审批，撤销后释放占用倍数</p>
                <button
                  type="button"
                  class="follow-card-btn follow-card-btn--cancel"
                  :disabled="actionLoading"
                  @click="confirmCancelPendingRequest(req)"
                >
                  撤销申请
                </button>
              </article>
            </div>
          </template>
        </div>

        <div v-else-if="pendingRequests.length > 0" class="card">
          <h3>📝 待我审批的申请 ({{ pendingRequests.length }})</h3>
          <table class="sub-table pending-requests-table">
            <colgroup>
              <col class="col-pending-name">
              <col class="col-pending-ratio">
              <col class="col-pending-action">
            </colgroup>
            <thead>
              <tr><th>申请人</th><th>比率</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-for="req in pendingRequests" :key="req.id">
                <td>{{ req.name }}</td>
                <td>{{ req.ratio }}x</td>
                <td>
                  <div class="request-actions">
                    <button
                      class="btn btn-success btn-sm"
                      :disabled="actionLoading"
                      @click="approveRequest(req.id)"
                    >
                      同意
                    </button>
                    <button
                      class="btn btn-danger btn-sm"
                      :disabled="actionLoading"
                      @click="rejectRequest(req.id)"
                    >
                      拒绝
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="currentUser.isLeader" class="card">
          <h3>👥 我的跟随者 ({{ myActiveFollowers.length }}/{{ myMaxFollowers }})</h3>
          <p class="leader-followers-hint">跟随者需在其控制台自行解除跟随，导师无法代为移除。</p>
          <table class="sub-table followers-table">
            <colgroup>
              <col class="col-follower-name">
              <col class="col-follower-ratio">
            </colgroup>
            <thead>
              <tr><th>跟随者</th><th>比率</th></tr>
            </thead>
            <tbody>
              <tr v-if="myActiveFollowers.length === 0">
                <td colspan="2" class="empty-td">暂无跟随者</td>
              </tr>
              <tr v-for="follower in myActiveFollowers" :key="follower.id">
                <td>{{ follower.name }}</td>
                <td>{{ follower.ratio }}x</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div
      v-if="tooltip.visible"
      class="js-smart-tooltip"
      :class="[tooltip.placement, { 'is-wide': tooltip.wrap }]"
      :style="{ top: tooltip.top + 'px', left: tooltip.left + 'px', opacity: tooltip.opacity }"
    >
      {{ tooltip.text }}
    </div>

    <LeaderDetailModal
      :leader="detailLeader"
      :can-edit-strategy="detailLeader ? canEditStrategyIntro(detailLeader) : false"
      :show-follower-count="Boolean(currentUser?.isLeader)"
      :show-follow-section="canApplyFollow"
      :active-follow="detailActiveFollow"
      :pending-request="detailPendingRequest"
      :ratio-min="FOLLOW_RATIO_MIN"
      :max-ratio="detailLeader ? leaderMaxRatio(detailLeader) : FOLLOW_RATIO_MIN"
      :quick-ratios="detailLeader ? quickRatioOptions(detailLeader) : []"
      :ratio-quota="ratioQuota"
      :follow-status="detailFollowStatus"
      :action-loading="actionLoading"
      :format-rate="formatRate"
      :format-profit-rate="formatProfitRate"
      :stat-class="statClass"
      :format-money="formatMoney"
      @close="closeLeaderDetail"
      @apply="onDetailApply"
      @set-ratio="onDetailSetRatio"
      @ratio-input="onDetailRatioInput"
      @edit-strategy="onDetailEditStrategy"
    />

    <Teleport to="body">
      <div
        v-if="editingStrategyLeader"
        class="strategy-modal-overlay"
        role="presentation"
        @click.self="cancelEditStrategy"
      >
        <div class="strategy-modal" role="dialog" aria-labelledby="strategy-modal-title">
          <h3 id="strategy-modal-title" class="strategy-modal-title">策略介绍</h3>
          <textarea
            v-model="strategyDraft"
            class="strategy-modal-input"
            rows="6"
            maxlength="500"
            placeholder="请输入策略介绍…"
            :disabled="editingStrategyLeader.strategySaving"
          />
          <div class="strategy-modal-footer">
            <span class="strategy-char-count">{{ strategyDraft.length }}/500</span>
            <div class="strategy-panel-actions">
              <button
                type="button"
                class="strategy-btn strategy-btn--ghost"
                :disabled="editingStrategyLeader.strategySaving"
                @click="cancelEditStrategy"
              >
                取消
              </button>
              <button
                type="button"
                class="strategy-btn strategy-btn--primary"
                :disabled="!isStrategyDraftDirty(editingStrategyLeader) || editingStrategyLeader.strategySaving || actionLoading"
                @click="saveStrategyIntro(editingStrategyLeader)"
              >
                {{ editingStrategyLeader.strategySaving ? '保存中…' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog
      v-model:open="confirmDialog.open"
      :title="confirmDialog.title"
      :description="confirmDialog.description"
      :items="confirmDialog.items"
      :facts="confirmDialog.facts"
      :mode="confirmDialog.mode"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :variant="confirmDialog.variant"
      @confirm="handleConfirmDialog"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import LeaderDetailModal from '../components/LeaderDetailModal.vue'
import * as authApi from '../api/auth.js'
import * as tradersApi from '../api/traders.js'
import * as followsApi from '../api/follows.js'
import { ApiError } from '../api/http.js'
import {
  FOLLOW_RATIO_MIN,
  FOLLOW_RATIO_MAX,
  normalizeFollowRatio,
  isValidFollowRatio,
  buildQuickRatioOptions,
} from '../constants/follow-ratio.js'
import { DEFAULT_MAX_FOLLOWERS } from '../constants/trader-quota.js'

const router = useRouter()
const currentUser = ref(null)
const pageLoading = ref(true)
const actionLoading = ref(false)
const leaders = ref([])
const hallSortKey = ref('profitRate')
const hallSortOrder = ref('desc')
const myActiveFollowers = ref([])
const pendingRequests = ref([])

const myFollows = ref([])
const myPendingRequests = ref([])
const ratioQuota = ref(null)
const editingStrategyLeaderId = ref(null)
const strategyDraft = ref('')
const detailLeaderId = ref(null)

const editingStrategyLeader = computed(() =>
  leaders.value.find((leader) => leader.id === editingStrategyLeaderId.value) ?? null,
)

const detailLeader = computed(() => {
  const targetId = Number(detailLeaderId.value)
  if (!Number.isInteger(targetId)) return null
  return leaders.value.find((leader) => Number(leader.id) === targetId) ?? null
})

const sortedLeaders = computed(() => {
  const key = hallSortKey.value
  const order = hallSortOrder.value
  const secondaryKey = key === 'profitRate' ? 'winRate' : 'profitRate'
  return [...leaders.value].sort((a, b) => {
    const primary = compareHallStat(a[key], b[key], order)
    if (primary !== 0) return primary
    const secondary = compareHallStat(a[secondaryKey], b[secondaryKey], order)
    if (secondary !== 0) return secondary
    return a.id - b.id
  })
})

const detailActiveFollow = computed(() => {
  if (!detailLeader.value) return null
  return findMyFollow(detailLeader.value.id, detailLeader.value.name)
})

const detailPendingRequest = computed(() => {
  if (!detailLeader.value || detailActiveFollow.value) return null
  return findMyPendingRequest(detailLeader.value.id, detailLeader.value.name)
})

async function openLeaderDetail(leader) {
  detailLeaderId.value = leader.id
  if (!currentUser.value?.isLeader) {
    try {
      await loadMyFollow()
    } catch {
      /* 打开详情时刷新跟随列表，失败则沿用缓存 */
    }
  }
}

function closeLeaderDetail() {
  detailLeaderId.value = null
}

const confirmDialog = reactive({
  open: false,
  title: '',
  description: '',
  items: [],
  facts: [],
  mode: 'confirm',
  confirmText: '确定',
  cancelText: '取消',
  variant: 'primary',
  onConfirm: null,
})

function openConfirmDialog(options) {
  confirmDialog.title = options.title
  confirmDialog.description = options.description ?? ''
  confirmDialog.items = options.items ?? []
  confirmDialog.facts = options.facts ?? []
  confirmDialog.mode = options.mode ?? 'confirm'
  confirmDialog.confirmText = options.confirmText ?? '确定'
  confirmDialog.cancelText = options.cancelText ?? '取消'
  confirmDialog.variant = options.variant ?? 'primary'
  confirmDialog.onConfirm = options.onConfirm ?? null
  confirmDialog.open = true
}

/** 仅提示、单按钮关闭 */
function openNoticeDialog(options) {
  openConfirmDialog({
    title: options.title,
    description: options.description ?? '',
    items: options.items ?? [],
    facts: options.facts ?? [],
    mode: 'notice',
    confirmText: options.confirmText ?? '知道了',
    variant: options.variant ?? 'primary',
  })
}

function buildRatioQuotaFacts(quota, { maxSelectable } = {}) {
  if (!quota) return []
  const facts = [
    { label: '可用余额', value: `${formatMoney(quota.availableBalance)} 元` },
    { label: '总跟单倍数', value: `${quota.usedRatio} / ${quota.totalRatioCap}` },
    { label: '配额规则', value: '每 1000 元可用 1 倍（含待审批）' },
  ]
  if (maxSelectable != null) {
    facts.unshift({
      label: '该导师最多可选',
      value: `${maxSelectable} 倍`,
      emphasis: true,
    })
  }
  return facts
}

function handleConfirmDialog() {
  confirmDialog.onConfirm?.()
  confirmDialog.onConfirm = null
}

const myMaxFollowers = computed(() => {
  return currentUser.value?.maxFollowers ?? DEFAULT_MAX_FOLLOWERS
})

const displayName = computed(() => {
  if (!currentUser.value) return ''
  return currentUser.value.nickName || currentUser.value.username
})

function unwrapApiPayload(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    ('status' in payload || 'msg' in payload)
  ) {
    return payload.data
  }
  return payload
}

function mapUser(user) {
  const profile = unwrapApiPayload(user) ?? {}
  return {
    id: profile.id,
    username: profile.username,
    nickName: profile.nickName,
    isLeader: Boolean(profile.isLeader ?? profile.is_leader),
    maxFollowers: profile.maxFollowers,
  }
}

const canApplyFollow = computed(() => !currentUser.value?.isLeader)

const quotaUsedPercent = computed(() => {
  const cap = ratioQuota.value?.totalRatioCap ?? 0
  const used = ratioQuota.value?.usedRatio ?? 0
  if (cap <= 0) return 0
  return Math.min(100, Math.round((used / cap) * 100))
})

const detailFollowStatus = computed(() => {
  if (!detailLeader.value) return null
  if (!canApplyFollow.value) {
    return {
      status: 'leader',
      label: '导师身份',
      reason: '当前为导师身份，无法申请跟随其他导师。',
      disabled: true,
      btnText: '无法申请',
      btnClass: '',
    }
  }
  return getFollowStatus(detailLeader.value)
})

function onDetailApply() {
  if (detailLeader.value) follow(detailLeader.value)
}

function onDetailSetRatio(ratio) {
  if (detailLeader.value) setRatio(detailLeader.value, ratio)
}

function onDetailRatioInput(event) {
  if (detailLeader.value) onFollowRatioInput(detailLeader.value, event)
}

function onDetailEditStrategy() {
  if (detailLeader.value) startEditStrategy(detailLeader.value)
}

function persistUser() {
  localStorage.setItem('current_user', JSON.stringify(currentUser.value))
}

function onFollowRatioInput(leader, event) {
  const input = event.target
  const raw = input.value
  if (raw === '' || raw === '-') return

  let intVal = raw.includes('.') ? Math.round(Number(raw)) : Number(raw)
  const max = leaderMaxRatio(leader)
  if (Number.isFinite(intVal) && intVal > max) {
    intVal = max
  }
  if (raw.includes('.') || intVal > max) {
    input.value = String(intVal)
    leader.inputRatio = intVal
  }
}

function effectiveLeaderMaxRatio(leader) {
  if (currentUser.value?.isLeader || leader.maxFollowRatio == null) {
    return FOLLOW_RATIO_MAX
  }
  return Math.max(0, Math.min(FOLLOW_RATIO_MAX, leader.maxFollowRatio))
}

function leaderMaxRatio(leader) {
  const max = effectiveLeaderMaxRatio(leader)
  return max >= FOLLOW_RATIO_MIN ? max : 0
}

function clampLeaderInputRatio(leader, value, fallback = 1) {
  const max = leaderMaxRatio(leader)
  const base = normalizeFollowRatio(value) ?? fallback
  if (max < FOLLOW_RATIO_MIN) return FOLLOW_RATIO_MIN
  return Math.min(Math.max(base, FOLLOW_RATIO_MIN), max)
}

function quickRatioOptions(leader) {
  return buildQuickRatioOptions(leaderMaxRatio(leader))
}

function formatMoney(value) {
  if (value == null || Number.isNaN(value)) return '--'
  return Number(value).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

function formatFollowRatioLimitHint(leader) {
  const max = leaderMaxRatio(leader)
  const quota = ratioQuota.value
  if (!quota) {
    return `该导师最多可选 ${max} 倍`
  }
  return `该导师最多可选 ${max} 倍（可用余额 ${formatMoney(quota.availableBalance)} 元，总倍数 ${quota.usedRatio}/${quota.totalRatioCap}，每 1000 元 1 倍）`
}

function resolveLeaderInputRatio(traderId, fallback = 1) {
  const ratio =
    findMyFollow(traderId)?.ratio ??
    findMyPendingRequest(traderId)?.ratio ??
    fallback
  return normalizeFollowRatio(ratio) ?? fallback
}

async function loadLeaders() {
  cancelEditStrategy()
  const previousRatios = new Map(
    leaders.value.map((leader) => [leader.id, leader.inputRatio]),
  )
  const { leaders: list, ratioQuota: quota } = await tradersApi.listTraders()
  if (!currentUser.value?.isLeader) {
    ratioQuota.value = quota ?? null
  }
  leaders.value = list.map((leader) => ({
    id: leader.id,
    name: leader.name,
    count: leader.count,
    maxFollowers: leader.maxFollowers,
    isFull: leader.isFull,
    maxFollowRatio: leader.maxFollowRatio,
    strategyIntro: leader.strategyIntro ?? '',
    winRate: leader.winRate ?? null,
    profitRate: leader.profitRate ?? null,
    savedStrategyIntro: leader.strategyIntro ?? '',
    strategySaving: false,
    inputRatio: clampLeaderInputRatio(
      leader,
      resolveLeaderInputRatio(leader.id, previousRatios.get(leader.id) ?? 1),
    ),
  }))
}

function compareHallStat(a, b, order) {
  const aMissing = a == null || Number.isNaN(a)
  const bMissing = b == null || Number.isNaN(b)
  if (aMissing && bMissing) return 0
  if (aMissing) return 1
  if (bMissing) return -1
  return order === 'asc' ? a - b : b - a
}

function toggleHallSort(key) {
  if (hallSortKey.value === key) {
    hallSortOrder.value = hallSortOrder.value === 'desc' ? 'asc' : 'desc'
    return
  }
  hallSortKey.value = key
  hallSortOrder.value = 'desc'
}

function formatRate(value) {
  if (value == null || Number.isNaN(value)) return '--'
  return `${value}%`
}

function formatProfitRate(value) {
  if (value == null || Number.isNaN(value)) return '--'
  return `${Number(value).toFixed(2)}%`
}

function statClass(value, colorize = false) {
  if (value == null || !colorize) return 'stat-value'
  if (value > 0) return 'stat-value stat-positive'
  if (value < 0) return 'stat-value stat-negative'
  return 'stat-value'
}

function canEditStrategyIntro(leader) {
  return currentUser.value?.isLeader && currentUser.value.id === leader.id
}

function isStrategyDraftDirty(leader) {
  return (strategyDraft.value ?? '').trim() !== (leader.savedStrategyIntro ?? '').trim()
}

function startEditStrategy(leader) {
  destroyTooltip()
  editingStrategyLeaderId.value = leader.id
  strategyDraft.value = leader.strategyIntro ?? ''
  document.body.style.overflow = 'hidden'
}

function cancelEditStrategy() {
  editingStrategyLeaderId.value = null
  strategyDraft.value = ''
  document.body.style.overflow = ''
}

async function saveStrategyIntro(leader) {
  if (!canEditStrategyIntro(leader) || !isStrategyDraftDirty(leader)) return
  leader.strategySaving = true
  try {
    const { strategyIntro } = await tradersApi.updateMyStrategyIntro(strategyDraft.value ?? '')
    leader.strategyIntro = strategyIntro
    leader.savedStrategyIntro = strategyIntro
    cancelEditStrategy()
  } catch (error) {
    handleApiError(error, '策略介绍保存失败')
  } finally {
    leader.strategySaving = false
  }
}

function normalizeFollowItem(row) {
  if (!row || typeof row !== 'object') return null
  const traderId = Number(row.traderId ?? row.trader_id)
  const id = Number(row.id)
  if (!Number.isInteger(id) || !Number.isInteger(traderId)) return null
  return {
    id,
    traderId,
    traderName: String(row.traderName ?? row.trader_name ?? ''),
    ratio: Number(row.ratio ?? row.followRatio ?? row.follow_ratio),
  }
}

function normalizePendingRequestItem(row) {
  if (!row || typeof row !== 'object') return null
  const traderId = Number(row.traderId ?? row.trader_id)
  const id = Number(row.id)
  if (!Number.isInteger(id) || !Number.isInteger(traderId)) return null
  return {
    id,
    traderId,
    traderName: String(row.traderName ?? row.trader_name ?? ''),
    ratio: Number(row.ratio ?? row.followRatio ?? row.follow_ratio),
  }
}

function normalizeMyFollowResponse(raw) {
  const payload = unwrapApiPayload(raw) ?? raw ?? {}
  if (Array.isArray(payload)) {
    return {
      follows: payload.map(normalizeFollowItem).filter(Boolean),
      pendingRequests: [],
      ratioQuota: null,
    }
  }
  const nested = payload.data
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return normalizeMyFollowResponse(nested)
  }
  return {
    follows: (payload.follows ?? []).map(normalizeFollowItem).filter(Boolean),
    pendingRequests: (payload.pendingRequests ?? []).map(normalizePendingRequestItem).filter(Boolean),
    ratioQuota: payload.ratioQuota ?? null,
  }
}

function findMyFollow(traderId, traderName = '') {
  const id = Number(traderId)
  if (!Number.isInteger(id)) return null
  const byId = myFollows.value.find((follow) => Number(follow.traderId) === id)
  if (byId) return byId
  const name = String(traderName).trim()
  if (!name) return null
  return myFollows.value.find((follow) => follow.traderName === name) ?? null
}

function findMyPendingRequest(traderId, traderName = '') {
  const id = Number(traderId)
  if (!Number.isInteger(id)) return null
  const byId = myPendingRequests.value.find((request) => Number(request.traderId) === id)
  if (byId) return byId
  const name = String(traderName).trim()
  if (!name) return null
  return myPendingRequests.value.find((request) => request.traderName === name) ?? null
}

async function loadMyFollow() {
  const payload = normalizeMyFollowResponse(await followsApi.getMyFollow())
  myFollows.value = payload.follows
  myPendingRequests.value = payload.pendingRequests
  if (payload.ratioQuota) ratioQuota.value = payload.ratioQuota
}

async function loadFollowers() {
  const { followers } = await tradersApi.listMyFollowers()
  myActiveFollowers.value = followers
}

async function loadPendingRequests() {
  const { requests } = await tradersApi.listPendingRequests()
  pendingRequests.value = requests
}

async function loadDashboard() {
  pageLoading.value = true
  try {
    const user = await authApi.getMe()
    currentUser.value = mapUser(user ?? {})
    persistUser()

    await loadLeaders()
    if (currentUser.value.isLeader) {
      await Promise.all([loadFollowers(), loadPendingRequests()])
    } else {
      await loadMyFollow()
      leaders.value = leaders.value.map((leader) => ({
        ...leader,
        inputRatio: clampLeaderInputRatio(
          leader,
          resolveLeaderInputRatio(leader.id, leader.inputRatio),
        ),
      }))
    }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      handleLogout()
      return
    }
    alert(error instanceof ApiError ? error.message : '加载失败')
  } finally {
    pageLoading.value = false
  }
}

const getFollowStatus = (leader) => {
  let status = 'ready'
  let label = '可申请'
  let reason = ''
  let disabled = false
  let btnText = '申请跟随'
  let btnClass = ''
  let followingRatio

  if (currentUser.value?.isLeader) {
    status = 'leader'
    label = '导师'
    reason = '当前身份为导师，系统限制多重身份混用'
    disabled = true
    btnText = '无法申请'
  } else if (findMyFollow(leader.id, leader.name)) {
    const activeFollow = findMyFollow(leader.id, leader.name)
    status = 'following'
    label = '已跟随'
    disabled = true
    btnText = '已跟随'
    btnClass = 'btn-success'
    followingRatio = activeFollow?.ratio
  } else if (findMyPendingRequest(leader.id, leader.name)) {
    status = 'pending'
    label = '待审批'
    disabled = true
    btnText = '待审批'
    btnClass = 'btn-outline'
  } else if (leader.isFull) {
    status = 'full'
    label = '已满员'
    reason = `该导师的可跟随名额已满 (${leader.maxFollowers}/${leader.maxFollowers})`
    disabled = true
    btnText = '已满员'
    btnClass = 'btn-full'
  } else if (leaderMaxRatio(leader) < FOLLOW_RATIO_MIN) {
    status = 'no-funds'
    label = '资金不足'
    const cap = ratioQuota.value?.totalRatioCap ?? 0
    const used = ratioQuota.value?.usedRatio ?? 0
    reason = `可用余额不足，总倍数上限 ${cap}，已占用 ${used}（含待审批）`
    disabled = true
    btnText = '资金不足'
    btnClass = 'btn-full'
  } else if (leader.inputRatio > leaderMaxRatio(leader)) {
    status = 'ratio-overflow'
    label = '倍数超限'
    reason = formatFollowRatioLimitHint(leader)
  }

  return { status, label, reason, disabled, btnText, btnClass, followingRatio }
}

const tooltip = reactive({
  visible: false,
  text: '',
  top: 0,
  left: 0,
  placement: 'placement-top',
  opacity: 0,
  wrap: false,
})

const handleGlobalMouseEnter = async (e) => {
  const target = e.target.closest('[data-title]')
  if (!target) return
  const text = target.getAttribute('data-title')
  if (!text) return

  tooltip.text = text
  tooltip.wrap = target.getAttribute('data-tooltip-wrap') === 'true'
  tooltip.visible = true
  tooltip.opacity = 0

  await nextTick()
  const tooltipEl = document.querySelector('.js-smart-tooltip')
  if (!tooltipEl) return

  const rect = target.getBoundingClientRect()
  const tooltipRect = tooltipEl.getBoundingClientRect()
  const forcedPlacement = target.getAttribute('data-placement')

  let calcTop = rect.top - tooltipRect.height - 8
  let placementClass = 'placement-top'

  if (forcedPlacement === 'top') {
    if (calcTop < 15) {
      calcTop = rect.bottom + 8
      placementClass = 'placement-bottom'
    }
  } else if (calcTop < 5) {
    calcTop = rect.bottom + 8
    placementClass = 'placement-bottom'
  }

  let calcLeft = rect.left + (rect.width - tooltipRect.width) / 2
  if (calcLeft < 5) calcLeft = 5
  if (calcLeft + tooltipRect.width > window.innerWidth - 5) {
    calcLeft = window.innerWidth - tooltipRect.width - 5
  }

  tooltip.top = calcTop
  tooltip.left = calcLeft
  tooltip.placement = placementClass
  tooltip.opacity = 1
}

const destroyTooltip = () => {
  tooltip.visible = false
  tooltip.text = ''
  tooltip.wrap = false
}

function onModalKeydown(event) {
  if (event.key !== 'Escape') return
  if (editingStrategyLeaderId.value) {
    cancelEditStrategy()
    return
  }
  if (detailLeaderId.value) {
    closeLeaderDetail()
  }
}

onMounted(() => {
  if (!localStorage.getItem('auth_token')) {
    router.push('/login')
    return
  }
  loadDashboard()
  document.body.addEventListener('mouseenter', handleGlobalMouseEnter, true)
  document.body.addEventListener('mouseleave', (e) => {
    if (e.target.closest('[data-title]')) destroyTooltip()
  }, true)
  document.addEventListener('scroll', destroyTooltip, true)
  window.addEventListener('keydown', onModalKeydown)
})

onUnmounted(() => {
  document.body.removeEventListener('mouseenter', handleGlobalMouseEnter, true)
  document.body.removeEventListener('mouseleave', destroyTooltip, true)
  document.removeEventListener('scroll', destroyTooltip, true)
  window.removeEventListener('keydown', onModalKeydown)
  document.body.style.overflow = ''
})

function handleApiError(error, fallback = '操作失败') {
  alert(error instanceof ApiError ? error.message : fallback)
}

const handleLogout = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('current_user')
  destroyTooltip()
  router.push('/login')
}

const setRatio = (leader, value) => {
  if (getFollowStatus(leader).disabled) return
  if (value > leaderMaxRatio(leader)) return
  leader.inputRatio = value
}

const follow = async (leader) => {
  const max = leaderMaxRatio(leader)
  if (max < FOLLOW_RATIO_MIN) {
    openNoticeDialog({
      title: '暂无法申请跟单',
      description: '可用余额不足，无法设置跟随倍数。',
      facts: buildRatioQuotaFacts(ratioQuota.value),
      variant: 'warning',
    })
    return
  }
  if (!Number.isInteger(leader.inputRatio)) {
    openNoticeDialog({
      title: '跟随倍数格式不正确',
      description: '跟随倍数须为整数。',
    })
    return
  }
  if (leader.inputRatio < FOLLOW_RATIO_MIN || leader.inputRatio > max) {
    openNoticeDialog({
      title: `跟随倍数不能超过 ${max} 倍`,
      description: `当前输入为 ${leader.inputRatio} 倍。`,
      facts: buildRatioQuotaFacts(ratioQuota.value, { maxSelectable: max }),
      variant: 'warning',
    })
    return
  }
  actionLoading.value = true
  try {
    const followRatio = Number(leader.inputRatio)
    const { request } = await followsApi.createFollow(leader.id, followRatio)
    myPendingRequests.value = [
      ...myPendingRequests.value,
      {
        id: request.id,
        traderId: request.traderId,
        traderName: request.traderName || leader.name,
        ratio: request.ratio ?? followRatio,
      },
    ]
    await loadLeaders()
    destroyTooltip()
    closeLeaderDetail()
    openNoticeDialog({
      title: '申请已提交',
      description: `已向 ${leader.name} 提交 ${followRatio} 倍跟随申请，请等待导师审批。`,
      facts: buildRatioQuotaFacts(ratioQuota.value),
    })
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) {
      const isQuotaMessage = /倍数|余额|配额/.test(error.message)
      openNoticeDialog({
        title: '无法申请跟单',
        description: error.message,
        variant: isQuotaMessage ? 'warning' : 'primary',
      })
    } else {
      handleApiError(error)
    }
  } finally {
    actionLoading.value = false
  }
}

const confirmUnfollow = (follow) => {
  openConfirmDialog({
    title: '确定解除跟随？',
    description: '解除后将停止复制该导师的新订单，所占跟单倍数配额会立即释放。',
    facts: [
      { label: '跟随导师', value: follow.traderName },
      { label: '跟随倍数', value: `${follow.ratio}x`, emphasis: true },
      { label: '当前状态', value: '跟随中' },
    ],
    items: [
      '已有开仓不会主动平掉；持仓仍会跟随导师操作，也可在交易平台自行操作',
      '解除后可重新申请跟随该导师或其他导师',
    ],
    confirmText: '确认解除',
    cancelText: '暂不解绑',
    variant: 'warning',
    onConfirm: () => unfollow(follow),
  })
}

const confirmCancelPendingRequest = (requestItem) => {
  openConfirmDialog({
    title: '确定撤销申请？',
    description: '撤销后该申请占用的跟单倍数配额将立即释放。',
    facts: [
      { label: '申请导师', value: requestItem.traderName },
      { label: '跟随倍数', value: `${requestItem.ratio}x`, emphasis: true },
      { label: '当前状态', value: '等待导师审批' },
    ],
    items: [
      '撤销后可重新向该导师或其他导师发起申请',
      '导师尚未审批，不会产生跟单关系',
    ],
    confirmText: '确认撤销',
    cancelText: '暂不撤销',
    variant: 'warning',
    onConfirm: () => cancelPendingRequest(requestItem),
  })
}

const unfollow = async (follow) => {
  actionLoading.value = true
  try {
    await followsApi.unfollow(follow.id)
    myFollows.value = myFollows.value.filter((item) => item.id !== follow.id)
    await loadLeaders()
    destroyTooltip()
  } catch (error) {
    handleApiError(error)
  } finally {
    actionLoading.value = false
  }
}

const cancelPendingRequest = async (requestItem) => {
  actionLoading.value = true
  try {
    await followsApi.cancelPendingRequest(requestItem.id)
    myPendingRequests.value = myPendingRequests.value.filter(
      (item) => item.id !== requestItem.id,
    )
    await loadLeaders()
    destroyTooltip()
  } catch (error) {
    handleApiError(error)
  } finally {
    actionLoading.value = false
  }
}

const approveRequest = async (requestId) => {
  actionLoading.value = true
  try {
    await tradersApi.approveRequest(requestId)
    await Promise.all([loadPendingRequests(), loadFollowers(), loadLeaders()])
    destroyTooltip()
  } catch (error) {
    handleApiError(error)
  } finally {
    actionLoading.value = false
  }
}

const rejectRequest = async (requestId) => {
  actionLoading.value = true
  try {
    await tradersApi.rejectRequest(requestId)
    await Promise.all([loadPendingRequests(), loadLeaders()])
    destroyTooltip()
  } catch (error) {
    handleApiError(error)
  } finally {
    actionLoading.value = false
  }
}

</script>

<style scoped src="./Dashboard.css"></style>

<style scoped>
.page-loading {
  padding: 48px;
  text-align: center;
  color: #64748b;
  font-size: 14px;
}

.leader-followers-hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}

.hall-leader-name {
  font-size: 14px;
}

.follow-panel-title {
  margin: 0 0 12px;
  font-size: 15px;
}

.follow-panel-subtitle {
  margin: 18px 0 10px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
  font-size: 14px;
  color: #64748b;
}

.quota-widget {
  margin-bottom: 16px;
  padding: 12px 14px;
  border-radius: 10px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
}

.quota-widget-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.quota-widget-title {
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.quota-widget-value {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.quota-widget-bar {
  height: 6px;
  margin-top: 10px;
  border-radius: 999px;
  background: #e2e8f0;
  overflow: hidden;
}

.quota-widget-bar__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
}

.quota-widget-meta {
  margin: 8px 0 0;
  font-size: 12px;
  color: #64748b;
}

.follow-cards {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.follow-card {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
}

.follow-card--active {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.follow-card--pending {
  border-color: var(--border);
  border-left: 3px solid #f59e0b;
  background: #fff;
}

.follow-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.follow-card-name {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}

.follow-card-badge {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.follow-card-badge--active {
  background: #d1fae5;
  color: #047857;
}

.follow-card-badge--pending {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.follow-card-ratio {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.follow-card--active .follow-card-ratio {
  color: #059669;
}

.follow-card--pending .follow-card-ratio {
  color: #d97706;
}

.follow-card-hint {
  margin: 6px 0 10px;
  font-size: 12px;
  line-height: 1.45;
  color: #64748b;
}

.follow-card-btn {
  width: 100%;
  min-height: 34px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.follow-card-btn--danger {
  border: 1px solid #fca5a5;
  background: #fff;
  color: #dc2626;
}

.follow-card-btn--danger:hover:not(:disabled) {
  background: #fef2f2;
  border-color: #f87171;
}

.follow-card-btn--cancel {
  border: none;
  background: #ef4444;
  color: #fff;
}

.follow-card-btn--cancel:hover:not(:disabled) {
  background: #dc2626;
}

.follow-card-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
</style>
