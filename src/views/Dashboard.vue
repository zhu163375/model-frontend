<template>
  <div v-if="currentUser" class="system-body">
    <header>
      <div class="header-left">
        <span class="system-title">跟单系统控制台</span>
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
                      step="0.1"
                      min="0.1"
                      :disabled="getFollowStatus(leader).disabled"
                    > x
                  </div>
                </td>
                <td>
                  <span
                    v-for="r in [0.5, 1.0, 2.0]"
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
          <h3>📋 我的当前跟随</h3>
          <div v-if="followState.traderId" class="follow-info">
            <div>目标导师: <b>{{ followState.traderName }}</b></div>
            <div>跟随比率: <b>{{ followState.ratio }}x</b></div>
            <button
              class="btn btn-danger btn-unfollow"
              :disabled="actionLoading"
              @click="unfollow"
            >
              解除跟随
            </button>
          </div>
          <div v-else-if="pendingRequestState.traderId" class="follow-info">
            <div>申请导师: <b>{{ pendingRequestState.traderName }}</b></div>
            <div>申请比率: <b>{{ pendingRequestState.ratio }}x</b></div>
            <p class="pending-hint">等待导师审批中…</p>
            <button
              class="btn btn-danger btn-unfollow"
              :disabled="actionLoading"
              @click="cancelPendingRequest"
            >
              撤销申请
            </button>
          </div>
          <div v-else class="empty-text">暂无任何跟单关系</div>
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
          <table class="sub-table">
            <thead>
              <tr><th>跟随者</th><th>比率</th><th>操作</th></tr>
            </thead>
            <tbody>
              <tr v-if="myActiveFollowers.length === 0">
                <td colspan="3" class="empty-td">暂无跟随者</td>
              </tr>
              <tr v-for="follower in myActiveFollowers" :key="follower.id">
                <td>{{ follower.name }}</td>
                <td>{{ follower.ratio }}x</td>
                <td>
                  <button
                    class="btn btn-danger btn-sm"
                    :disabled="actionLoading"
                    @click="removeFollower(follower.id)"
                  >
                    移除
                  </button>
                </td>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as authApi from '../api/auth.js'
import * as tradersApi from '../api/traders.js'
import * as followsApi from '../api/follows.js'
import { ApiError } from '../api/http.js'

const router = useRouter()
const currentUser = ref(null)
const pageLoading = ref(true)
const actionLoading = ref(false)
const leaders = ref([])
const myActiveFollowers = ref([])
const pendingRequests = ref([])

const followState = reactive({
  traderId: null,
  traderName: '',
  ratio: null,
})

const pendingRequestState = reactive({
  traderId: null,
  traderName: '',
  ratio: null,
})

const displayName = computed(() => {
  if (!currentUser.value) return ''
  return currentUser.value.nickName || currentUser.value.username
})

const isRoleActionDisabled = computed(() => {
  if (!currentUser.value) return false
  if (currentUser.value.isLeader) {
    return myActiveFollowers.value.length > 0 || pendingRequests.value.length > 0
  }
  return !!followState.traderId || !!pendingRequestState.traderId
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
  } else if (followState.traderId) {
    return '当前已绑定跟随其他导师，多重身份互斥'
  } else if (pendingRequestState.traderId) {
    return '当前有待审批的跟单申请'
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

async function loadLeaders() {
  const { leaders: list } = await tradersApi.listTraders()
  leaders.value = list.map((leader) => ({
    id: leader.id,
    name: leader.name,
    count: leader.count,
    maxFollowers: leader.maxFollowers,
    isFull: leader.isFull,
    inputRatio: 1.0,
  }))
}

function clearPendingRequestState() {
  pendingRequestState.traderId = null
  pendingRequestState.traderName = ''
  pendingRequestState.ratio = null
}

function clearFollowState() {
  followState.traderId = null
  followState.traderName = ''
  followState.ratio = null
}

async function loadMyFollow() {
  const { follow, pendingRequest } = await followsApi.getMyFollow()
  if (follow) {
    followState.traderId = follow.traderId
    followState.traderName = follow.traderName
    followState.ratio = follow.ratio
    clearPendingRequestState()
  } else if (pendingRequest) {
    clearFollowState()
    pendingRequestState.traderId = pendingRequest.traderId
    pendingRequestState.traderName = pendingRequest.traderName || ''
    pendingRequestState.ratio = pendingRequest.ratio
  } else {
    clearFollowState()
    clearPendingRequestState()
  }
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
  } else if (followState.traderId === leader.id) {
    disabled = true
    btnText = '已跟随'
    btnClass = 'btn-success'
  } else if (pendingRequestState.traderId === leader.id) {
    disabled = true
    btnText = '待审批'
    btnClass = 'btn-outline'
  } else if (followState.traderId || pendingRequestState.traderId) {
    reason = followState.traderId
      ? '系统限制同时跟随多位导师'
      : '已有待审批的跟单申请'
    disabled = true
  } else if (leader.isFull) {
    reason = `该导师的可跟随名额已满 (${leader.maxFollowers}/${leader.maxFollowers})`
    disabled = true
    btnText = '已满员'
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
  if (followState.traderId || pendingRequestState.traderId) return
  actionLoading.value = true
  try {
    const user = await authApi.applyLeader()
    currentUser.value = mapUser(user)
    persistUser()
    clearFollowState()
    clearPendingRequestState()
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
  if (!leader.inputRatio || leader.inputRatio <= 0) {
    alert('请输入有效比率')
    return
  }
  actionLoading.value = true
  try {
    const { request } = await followsApi.createFollow(leader.id, Number(leader.inputRatio))
    clearFollowState()
    pendingRequestState.traderId = request.traderId
    pendingRequestState.traderName = request.traderName || leader.name
    pendingRequestState.ratio = request.ratio
    await loadLeaders()
    destroyTooltip()
  } catch (error) {
    handleApiError(error)
  } finally {
    actionLoading.value = false
  }
}

const unfollow = async () => {
  actionLoading.value = true
  try {
    await followsApi.unfollow()
    clearFollowState()
    await loadLeaders()
    destroyTooltip()
  } catch (error) {
    handleApiError(error)
  } finally {
    actionLoading.value = false
  }
}

const cancelPendingRequest = async () => {
  actionLoading.value = true
  try {
    await followsApi.unfollow()
    clearPendingRequestState()
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

const removeFollower = async (followRecordId) => {
  actionLoading.value = true
  try {
    await tradersApi.removeFollower(followRecordId)
    await loadFollowers()
    await loadLeaders()
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
</style>
