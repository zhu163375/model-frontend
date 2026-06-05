<template>
  <div v-if="currentUser" class="system-body">
    <header>
      <div class="header-left">
        <span class="system-title">实物料跟单社区</span>
        <span :class="['badge', currentUser.isLeader ? 'badge-leader' : 'badge-user']">
          {{ currentUser.isLeader ? '导师 (Leader)' : '普通用户' }}
        </span>
      </div>
      <div class="header-right">
        <button
          class="btn"
          :class="currentUser.isLeader ? 'btn-outline' : 'btn-success'"
          :disabled="isRoleActionDisabled || actionLoading"
          :data-title="roleActionTooltip"
          data-placement="top"
          @click="currentUser.isLeader ? cancelLeaderRole() : applyForLeader()"
        >
          <span class="btn-text-full">{{ currentUser.isLeader ? '取消导师角色' : '申请成为 Leader' }}</span>
          <span class="btn-text-short">{{ currentUser.isLeader ? '取消角色' : '申请 Leader' }}</span>
        </button>
        <span class="user-display">当前登录: {{ displayName }}</span>
        <button class="btn btn-danger btn-logout" @click="handleLogout">退出注销</button>
      </div>
    </header>

    <div v-if="pageLoading" class="page-loading">加载中...</div>

    <div v-else class="container">
      <div class="main-hall">
        <h3 class="hall-title">🏆 导师市场大厅</h3>
        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>导师姓名</th>
                <th>当前人数</th>
                <th>设置跟随比率</th>
                <th>快捷设置</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="leaders.length === 0">
                <td colspan="5" class="empty-td">暂无导师数据</td>
              </tr>
              <tr v-for="leader in leaders" :key="leader.id">
                <td><b>{{ leader.name }}</b></td>
                <td :style="{ color: leader.isFull ? 'var(--danger)' : '#1e293b' }">
                  {{ leader.count }} / {{ leader.maxFollowers }} 人
                </td>
                <td>
                  <div class="input-tooltip-wrapper" :data-title="getFollowStatus(leader).reason">
                    <input
                      type="number"
                      v-model.number="leader.inputRatio"
                      step="1"
                      :min="FOLLOW_RATIO_MIN"
                      :max="FOLLOW_RATIO_MAX"
                      :disabled="getFollowStatus(leader).disabled"
                      @input="onFollowRatioInput(leader, $event)"
                    > x
                  </div>
                </td>
                <td>
                  <span
                    v-for="r in [1, 10, 50]"
                    :key="r"
                    :class="['ratio-chip', { disabled: getFollowStatus(leader).disabled }]"
                    :data-title="getFollowStatus(leader).reason"
                    @click="setRatio(leader, r)"
                  >
                    {{ r }}x
                  </span>
                </td>
                <td>
                  <button
                    :class="['btn', getFollowStatus(leader).btnClass]"
                    :disabled="getFollowStatus(leader).disabled || actionLoading"
                    :data-title="getFollowStatus(leader).reason"
                    @click="follow(leader)"
                  >
                    {{ getFollowStatus(leader).btnText }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="sidebar">
        <div v-if="!currentUser.isLeader" class="card">
          <h3>📋 我的跟随 ({{ myFollows.length }})</h3>
          <div v-if="myFollows.length > 0" class="follow-list">
            <div v-for="follow in myFollows" :key="follow.id" class="follow-info">
              <div>目标导师: <b>{{ follow.traderName }}</b></div>
              <div>跟随比率: <b>{{ follow.ratio }}x</b></div>
              <p class="unfollow-hint">
                解除后不再复制该导师的新订单；已开立的持仓不会自动平仓，请自行在交易平台处理。
              </p>
              <button
                class="btn btn-danger btn-unfollow"
                :disabled="actionLoading"
                @click="confirmUnfollow(follow)"
              >
                解除跟随
              </button>
            </div>
          </div>
          <div v-else class="empty-text">暂无已生效的跟随</div>

          <h3 v-if="myPendingRequests.length > 0" class="pending-section-title">
            ⏳ 待审批申请 ({{ myPendingRequests.length }})
          </h3>
          <div v-if="myPendingRequests.length > 0" class="follow-list">
            <div v-for="req in myPendingRequests" :key="req.id" class="follow-info">
              <div>申请导师: <b>{{ req.traderName }}</b></div>
              <div>申请比率: <b>{{ req.ratio }}x</b></div>
              <p class="pending-hint">等待导师审批中…</p>
              <button
                class="btn btn-danger btn-unfollow"
                :disabled="actionLoading"
                @click="confirmCancelPendingRequest(req)"
              >
                撤销申请
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="pendingRequests.length > 0" class="card">
          <h3>📝 待我审批的申请 ({{ pendingRequests.length }})</h3>
          <table class="sub-table">
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
          <h3>👥 我的跟随者 ({{ myActiveFollowers.length }}/10)</h3>
          <p class="leader-followers-hint">跟随者需在其控制台自行解除跟随，导师无法代为移除。</p>
          <table class="sub-table">
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
      :class="[tooltip.placement]"
      :style="{ top: tooltip.top + 'px', left: tooltip.left + 'px', opacity: tooltip.opacity }"
    >
      {{ tooltip.text }}
    </div>

    <ConfirmDialog
      v-model:open="confirmDialog.open"
      :title="confirmDialog.title"
      :description="confirmDialog.description"
      :items="confirmDialog.items"
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
import * as authApi from '../api/auth.js'
import * as tradersApi from '../api/traders.js'
import * as followsApi from '../api/follows.js'
import { ApiError } from '../api/http.js'
import {
  FOLLOW_RATIO_MIN,
  FOLLOW_RATIO_MAX,
  normalizeFollowRatio,
  isValidFollowRatio,
} from '../constants/follow-ratio.js'

const router = useRouter()
const currentUser = ref(null)
const pageLoading = ref(true)
const actionLoading = ref(false)
const leaders = ref([])
const myActiveFollowers = ref([])
const pendingRequests = ref([])

const myFollows = ref([])
const myPendingRequests = ref([])

const confirmDialog = reactive({
  open: false,
  title: '',
  description: '',
  items: [],
  confirmText: '确定',
  cancelText: '取消',
  variant: 'primary',
  onConfirm: null,
})

function openConfirmDialog(options) {
  confirmDialog.title = options.title
  confirmDialog.description = options.description ?? ''
  confirmDialog.items = options.items ?? []
  confirmDialog.confirmText = options.confirmText ?? '确定'
  confirmDialog.cancelText = options.cancelText ?? '取消'
  confirmDialog.variant = options.variant ?? 'primary'
  confirmDialog.onConfirm = options.onConfirm ?? null
  confirmDialog.open = true
}

function handleConfirmDialog() {
  confirmDialog.onConfirm?.()
  confirmDialog.onConfirm = null
}

const displayName = computed(() => {
  if (!currentUser.value) return ''
  return currentUser.value.nickName || currentUser.value.username
})

const isRoleActionDisabled = computed(() => {
  if (!currentUser.value) return false
  if (currentUser.value.isLeader) {
    return myActiveFollowers.value.length > 0 || pendingRequests.value.length > 0
  }
  return myFollows.value.length > 0 || myPendingRequests.value.length > 0
})

const roleActionTooltip = computed(() => {
  if (!currentUser.value) return ''
  if (currentUser.value.isLeader) {
    if (myActiveFollowers.value.length > 0) {
      return '当前仍有活跃中的跟随者'
    }
    if (pendingRequests.value.length > 0) {
      return '当前存在未处理的跟单申请'
    }
  } else if (myFollows.value.length > 0 || myPendingRequests.value.length > 0) {
    return '当前仍有跟单关系或待审批申请'
  }
  return ''
})

function mapUser(user) {
  return {
    id: user.id,
    username: user.username,
    nickName: user.nickName,
    isLeader: user.isLeader,
  }
}

function persistUser() {
  localStorage.setItem('current_user', JSON.stringify(currentUser.value))
}

function onFollowRatioInput(leader, event) {
  const input = event.target
  const raw = input.value
  if (raw === '' || raw === '-') return

  if (raw.includes('.')) {
    const intVal = Math.round(Number(raw))
    input.value = String(intVal)
    leader.inputRatio = intVal
  }
}

function resolveLeaderInputRatio(traderId, fallback = 1) {
  const ratio =
    findMyFollow(traderId)?.ratio ??
    findMyPendingRequest(traderId)?.ratio ??
    fallback
  return normalizeFollowRatio(ratio) ?? fallback
}

async function loadLeaders() {
  const previousRatios = new Map(
    leaders.value.map((leader) => [leader.id, leader.inputRatio]),
  )
  const { leaders: list } = await tradersApi.listTraders()
  leaders.value = list.map((leader) => ({
    id: leader.id,
    name: leader.name,
    count: leader.count,
    maxFollowers: leader.maxFollowers,
    isFull: leader.isFull,
    inputRatio: resolveLeaderInputRatio(
      leader.id,
      previousRatios.get(leader.id) ?? 1,
    ),
  }))
}

function findMyFollow(traderId) {
  return myFollows.value.find((follow) => follow.traderId === traderId)
}

function findMyPendingRequest(traderId) {
  return myPendingRequests.value.find((request) => request.traderId === traderId)
}

async function loadMyFollow() {
  const { follows, pendingRequests } = await followsApi.getMyFollow()
  myFollows.value = follows
  myPendingRequests.value = pendingRequests
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
    currentUser.value = mapUser(user)
    persistUser()

    await loadLeaders()
    if (currentUser.value.isLeader) {
      await Promise.all([loadFollowers(), loadPendingRequests()])
    } else {
      await loadMyFollow()
      leaders.value = leaders.value.map((leader) => ({
        ...leader,
        inputRatio: resolveLeaderInputRatio(leader.id, leader.inputRatio),
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
  let reason = ''
  let disabled = false
  let btnText = '申请跟随'
  let btnClass = ''

  if (currentUser.value?.isLeader) {
    reason = '当前身份为导师，系统限制多重身份混用'
    disabled = true
  } else if (findMyFollow(leader.id)) {
    disabled = true
    btnText = '已跟随'
    btnClass = 'btn-success'
  } else if (findMyPendingRequest(leader.id)) {
    disabled = true
    btnText = '待审批'
    btnClass = 'btn-outline'
  } else if (leader.isFull) {
    reason = `该导师的可跟随名额已满 (${leader.maxFollowers}/${leader.maxFollowers})`
    disabled = true
    btnText = '已满员'
    btnClass = 'btn-full'
  }

  return { reason, disabled, btnText, btnClass }
}

const tooltip = reactive({
  visible: false,
  text: '',
  top: 0,
  left: 0,
  placement: 'placement-top',
  opacity: 0,
})

const handleGlobalMouseEnter = async (e) => {
  const target = e.target.closest('[data-title]')
  if (!target) return
  const text = target.getAttribute('data-title')
  if (!text) return

  tooltip.text = text
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
})

onUnmounted(() => {
  document.body.removeEventListener('mouseenter', handleGlobalMouseEnter, true)
  document.body.removeEventListener('mouseleave', destroyTooltip, true)
  document.removeEventListener('scroll', destroyTooltip, true)
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

const applyForLeader = async () => {
  if (myFollows.value.length > 0 || myPendingRequests.value.length > 0) return
  actionLoading.value = true
  try {
    const user = await authApi.applyLeader()
    currentUser.value = mapUser(user)
    persistUser()
    myFollows.value = []
    myPendingRequests.value = []
    await loadLeaders()
    await Promise.all([loadFollowers(), loadPendingRequests()])
    destroyTooltip()
  } catch (error) {
    handleApiError(error)
  } finally {
    actionLoading.value = false
  }
}

const cancelLeaderRole = async () => {
  if (myActiveFollowers.value.length > 0 || pendingRequests.value.length > 0) return
  actionLoading.value = true
  try {
    const user = await authApi.cancelLeader()
    currentUser.value = mapUser(user)
    persistUser()
    myActiveFollowers.value = []
    pendingRequests.value = []
    await loadLeaders()
    await loadMyFollow()
    destroyTooltip()
  } catch (error) {
    handleApiError(error)
  } finally {
    actionLoading.value = false
  }
}

const setRatio = (leader, value) => {
  if (getFollowStatus(leader).disabled) return
  leader.inputRatio = value
}

const follow = async (leader) => {
  if (!isValidFollowRatio(leader.inputRatio)) {
    alert(`跟随比例需在 ${FOLLOW_RATIO_MIN} 到 ${FOLLOW_RATIO_MAX} 之间，且为整数`)
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
  } catch (error) {
    handleApiError(error)
  } finally {
    actionLoading.value = false
  }
}

const confirmUnfollow = (follow) => {
  openConfirmDialog({
    title: `确定解除对 ${follow.traderName} 的跟随？`,
    items: [
      '解除后将不再复制该导师的新订单',
      '已开立的持仓不会自动平仓，请自行在交易平台处理',
      '解除后可重新向该导师或其他导师发起申请',
    ],
    confirmText: '确认解除',
    variant: 'danger',
    onConfirm: () => unfollow(follow),
  })
}

const confirmCancelPendingRequest = (requestItem) => {
  openConfirmDialog({
    title: `确定撤销对 ${requestItem.traderName} 的申请？`,
    description: '撤销后可重新选择导师并提交申请。',
    confirmText: '确认撤销',
    variant: 'primary',
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

.pending-hint {
  margin: 8px 0 12px;
  font-size: 13px;
  color: #b45309;
}

.pending-section-title {
  margin: 20px 0 12px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
  font-size: 15px;
}

.follow-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.follow-list .follow-info {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.follow-list .follow-info:last-child {
  padding-bottom: 0;
  border-bottom: none;
}

.unfollow-hint,
.leader-followers-hint {
  margin: 0 0 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #64748b;
}
</style>
