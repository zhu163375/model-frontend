<template>
  <div v-if="currentUser" class="system-body">
    <!-- 🖥️ 顶部状态栏 -->
    <header>
      <div class="header-left">
        <span class="system-title">跟单系统控制台</span>
        <span :class="['badge', currentUser.isLeader ? 'badge-leader' : 'badge-user']">
          {{ currentUser.isLeader ? '导师 (Leader)' : '普通用户' }}
        </span>
      </div>
      <div class="header-right">
        <!-- 💡 顶部核心按钮：指定 data-placement="top" 强制向上弹出，空间不足自动掉头 -->
        <button 
          class="btn" 
          :class="currentUser.isLeader ? 'btn-outline' : 'btn-success'"
          :disabled="isRoleActionDisabled"
          :data-title="roleActionTooltip"
          data-placement="top"
          @click="currentUser.isLeader ? cancelLeaderRole() : applyForLeader()"
        >
          <span class="btn-text-full">{{ currentUser.isLeader ? '取消导师角色' : '申请成为 Leader' }}</span>
          <span class="btn-text-short">{{ currentUser.isLeader ? '取消角色' : '申请 Leader' }}</span>
        </button>
        <span class="user-display">当前登录: {{ currentUser.username }}</span>
        <button class="btn btn-danger btn-logout" @click="handleLogout">退出注销</button>
      </div>
    </header>

    <!-- 主体双栏内容区域 -->
    <div class="container">
      <!-- 左侧大厅 -->
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
              <tr v-for="leader in leaders" :key="leader.id">
                <td><b>{{ leader.name }}</b></td>
                <td :style="{ color: leader.count >= 10 ? 'var(--danger)' : '#1e293b' }">
                  {{ leader.count }} / 10 人
                </td>
                <td>
                  <div class="input-tooltip-wrapper" :data-title="getFollowStatus(leader).reason">
                    <input 
                      type="number" 
                      v-model="leader.inputRatio" 
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
                    :disabled="getFollowStatus(leader).disabled"
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

      <!-- 右侧工作台（根据登录身份动态自适应展示） -->
      <div class="sidebar">
        <!-- 视角 A：普通用户工作台 -->
        <div v-if="!currentUser.isLeader" class="card">
          <h3>📋 我的当前跟随</h3>
          <div v-if="followState.followingId && currentFollowingLeader" class="follow-info">
            <div>目标导师: <b>{{ currentFollowingLeader.name }}</b></div>
            <div>跟随比率: <b>{{ followState.ratio }}x</b></div>
            <button class="btn btn-danger btn-unfollow" @click="unfollow">解除跟随</button>
          </div>
          <div v-else class="empty-text">暂无任何跟单关系</div>
        </div>

        <!-- 视角 B：导师审批工作台 -->
        <template v-else>
          <div class="card">
            <h3>📥 待我审批的申请</h3>
            <table class="sub-table">
              <thead>
                <tr><th>申请人</th><th>比率</th><th>操作</th></tr>
              </thead>
              <tbody>
                <tr v-if="mockRequests.length === 0">
                  <td colspan="3" class="empty-td">无待处理申请</td>
                </tr>
                <tr v-for="req in mockRequests" :key="req.id">
                  <td>{{ req.name }}</td>
                  <td>{{ req.ratio }}x</td>
                  <td>
                    <button class="btn btn-success btn-sm" @click="approve(req)">同意</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="card">
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
                    <button class="btn btn-danger btn-sm" @click="removeFollower(follower.id)">移除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </template>
      </div>
    </div>

    <!-- 🎨 全局单例无污染 Tooltip DOM 节点 -->
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

const router = useRouter()
const currentUser = ref(null)

// 挂载时安全读取存储的登录信息
onMounted(() => {
  const user = localStorage.getItem('current_user')
  if (!user) {
    router.push('/login')
    return
  }
  currentUser.value = JSON.parse(user)
})

const followState = reactive({ followingId: null, ratio: null })

// 初始化 15 位市场模拟导师数据
const leaders = ref(
  Array.from({ length: 15 }, (_, i) => ({
    id: `trader_${i + 1}`,
    name: `导师 ${i + 1} 号 (专业交易员)`,
    count: i + 1 === 3 ? 10 : ((i + 1) * 3) % 10,
    inputRatio: 1.0
  }))
)

// 导师模拟审批工作流数据
const mockRequests = ref([{ id: 'r1', name: 'User_小张', ratio: '1.5' }])
const myActiveFollowers = ref([{ id: 'f1', name: 'User_阿强', ratio: '1.0' }])

const currentFollowingLeader = computed(() => {
  return leaders.value.find(l => l.id === followState.followingId)
})

// 顶部互斥锁定逻辑
const isRoleActionDisabled = computed(() => {
  if (!currentUser.value) return false
  if (currentUser.value.isLeader) {
    return mockRequests.value.length > 0 || myActiveFollowers.value.length > 0
  } else {
    return !!followState.followingId
  }
})

const roleActionTooltip = computed(() => {
  if (!currentUser.value) return ''
  if (currentUser.value.isLeader) {
    if (mockRequests.value.length > 0 && myActiveFollowers.value.length > 0) {
      return '当前存在未处理的跟单申请及活跃中的跟随者'
    } else if (mockRequests.value.length > 0) {
      return '当前存在未处理的跟单申请'
    } else if (myActiveFollowers.value.length > 0) {
      return '当前仍有活跃中的跟随者'
    }
  } else {
    if (followState.followingId) {
      return '当前已绑定跟随其他导师，多重身份互斥'
    }
  }
  return ''
})

// 动态算出每一行大厅的锁定状态和浮动提示语
const getFollowStatus = (leader) => {
  let reason = ''; let disabled = false; let btnText = '立即跟随'; let btnClass = ''
  if (currentUser.value?.isLeader) {
    reason = '当前身份为导师，系统限制多重身份混用'
    disabled = true
  } else if (followState.followingId === leader.id) {
    disabled = true
    btnText = '已跟随'
    btnClass = 'btn-success'
  } else if (followState.followingId) {
    reason = '系统限制同时跟随多位导师'
    disabled = true
  } else if (leader.count >= 10) {
    reason = '该导师的可跟随名额已满 (10/10)'
    disabled = true
    btnText = '已满员'
  }
  return { reason, disabled, btnText, btnClass }
}

// ==========================================================================
// 🧠 核心：智能反冲测绘 Tooltip 引擎
// ==========================================================================
const tooltip = reactive({ visible: false, text: '', top: 0, left: 0, placement: 'placement-top', opacity: 0 })

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
    if (calcTop < 15) { // 撞顶重力反转
      calcTop = rect.bottom + 8
      placementClass = 'placement-bottom'
    }
  } else {
    if (calcTop < 5) {
      calcTop = rect.bottom + 8
      placementClass = 'placement-bottom'
    }
  }

  let calcLeft = rect.left + (rect.width - tooltipRect.width) / 2
  if (calcLeft < 5) calcLeft = 5
  if (calcLeft + tooltipRect.width > window.innerWidth - 5) {
    calcLeft = window.innerWidth - tooltipRect.width - 5
  }

  tooltip.top = calcTop
  tooltip.left = calcLeft
  tooltip.placement = placementClass;
  tooltip.opacity = 1
}

const destroyTooltip = () => { tooltip.visible = false; tooltip.text = '' }

// 监听事件注册
onMounted(() => {
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

// ==========================================================================
// 💼 核心业务交互
// ==========================================================================
const handleLogout = () => {
  localStorage.clear()
  destroyTooltip()
  router.push('/login')
}

const applyForLeader = () => {
  if (followState.followingId) return
  currentUser.value.isLeader = true
  currentUser.value.username = 'user123 (已晋升)'
  localStorage.setItem('current_user', JSON.stringify(currentUser.value))
  mockRequests.value = []
  myActiveFollowers.value = []
  destroyTooltip()
}

const cancelLeaderRole = () => {
  if (myActiveFollowers.value.length > 0 || mockRequests.value.length > 0) return
  currentUser.value.isLeader = false
  currentUser.value.username = 'user123'
  localStorage.setItem('current_user', JSON.stringify(currentUser.value))
  destroyTooltip()
}

const setRatio = (leader, value) => {
  if (getFollowStatus(leader).disabled) return
  leader.inputRatio = value
}

const follow = (leader) => {
  if (!leader.inputRatio || leader.inputRatio <= 0) {
    alert('请输入有效比率')
    return
  }
  followState.followingId = leader.id
  followState.ratio = leader.inputRatio
  destroyTooltip()
}

const unfollow = () => {
  followState.followingId = null
  followState.ratio = null
}

const approve = (req) => {
  mockRequests.value = mockRequests.value.filter(r => r.id !== req.id)
  myActiveFollowers.value.push({ id: req.id, name: req.name, ratio: req.ratio })
}

const removeFollower = (id) => {
  myActiveFollowers.value = myActiveFollowers.value.filter(f => f.id !== id)
}
</script>

<style scoped>
:global(html), :global(body), :global(#app) {
  margin: 0 !important;
  padding: 0 !important;
  height: 100% !important;
  width: 100% !important;
  overflow: hidden !important;
}

.system-body {
  --primary: #2563eb;
  --success: #10b981;
  --danger: #ef4444;
  --border: #e2e8f0;
  --bg: #f8fafc;
  
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  height: 100vh; width: 100vw;
  overflow: hidden;
  box-sizing: border-box;
  background-color: var(--bg);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

header {
  height: 60px;
  background: #fff;
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border);
  box-sizing: border-box;
}

.header-left, .header-right { display: flex; align-items: center; gap: 16px; }
.system-title { font-size: 18px; font-weight: bold; }
.user-display { font-size: 14px; color: #475569; font-weight: bold; }

.container {
  display: grid;
  grid-template-columns: 2.5fr 1fr; 
  gap: 20px;
  padding: 20px;
  height: calc(100vh - 60px); 
  box-sizing: border-box;
}

.main-hall {
  background: #fff;
  border: 1px solid var(--border);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  height: 100%; 
  overflow: hidden;
}

.hall-title { padding: 16px 20px; margin: 0; border-bottom: 1px solid var(--border); font-size: 16px; }
.table-wrapper { flex-grow: 1; overflow-y: auto; padding: 0 20px; }
.sidebar { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; height: 100%; }

table { width: 100%; border-collapse: collapse; text-align: left; }
th:nth-child(1), td:nth-child(1) { width: 30%; } 
th:nth-child(2), td:nth-child(2) { width: 15%; } 
th:nth-child(3), td:nth-child(3) { width: 18%; } 
th:nth-child(4), td:nth-child(4) { width: 22%; } 
th:nth-child(5), td:nth-child(5) { width: 15%; } 

th {
  position: sticky; top: 0; background: #fff; 
  padding: 14px 8px; color: #64748b; font-size: 13px;
  border-bottom: 2px solid var(--border); z-index: 10; 
}
td { padding: 14px 8px; border-bottom: 1px solid var(--border); font-size: 14px; white-space: nowrap; }
.sub-table { table-layout: auto; }
.empty-td { text-align: center; color: #94a3b8; padding: 10px 0; }

.card { background: #fff; border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
.card h3 { margin-top: 0; margin-bottom: 12px; }

.badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
.badge-user { background: #fee2e2; color: var(--danger); }
.badge-leader { background: #dbeafe; color: var(--primary); }

.btn { background: var(--primary); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 13px; transition: all 0.2s; }
.btn-danger { background: var(--danger); }
.btn-success { background: var(--success); }
.btn-outline { background: transparent; border: 1px solid var(--primary); color: var(--primary); }
.btn-outline:hover { background: #eff6ff; }
.btn-logout { padding: 4px 12px; font-size: 12px; }
.btn-unfollow { margin-top: 8px; width: 100%; padding: 4px; }
.btn-sm { padding: 2px 8px; font-size: 12px; }

.btn:disabled, .ratio-chip.disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; border-color: #e2e8f0; pointer-events: auto !important; }
.btn:disabled { opacity: 0.5 !important; }

.input-tooltip-wrapper { display: inline-block; pointer-events: auto; }
.input-tooltip-wrapper input:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; border: 1px solid #cbd5e1; }

.ratio-chip { display: inline-block; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-size: 12px; cursor: pointer; margin-left: 2px; border: 1px solid #cbd5e1; color: #334155; }
.ratio-chip:hover:not(.disabled) { background: #e2e8f0; }

input[type="number"] { width: 45px; padding: 4px; text-align: center; }

.js-smart-tooltip {
  position: fixed; background: rgba(15, 23, 42, 0.95); color: #fff;
  padding: 6px 12px; font-size: 12px; border-radius: 4px; white-space: nowrap;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); pointer-events: none; z-index: 999999;
  transition: opacity 0.1s ease;
}
.js-smart-tooltip::before { content: ''; position: absolute; left: 50%; transform: translateX(-50%); border: 5px solid transparent; }
.js-smart-tooltip.placement-top::before { bottom: -10px; border-top-color: rgba(15, 23, 42, 0.95); }
.js-smart-tooltip.placement-bottom::before { top: -10px; border-bottom-color: rgba(15, 23, 42, 0.95); }

.follow-info { font-size: 14px; line-height: 1.8; }
.empty-text { color: #94a3b8; font-size: 14px; }

.btn-text-short { display: none; }

@media (max-width: 768px) {
  :global(html), :global(body), :global(#app) {
    overflow: auto !important;
    height: auto !important;
    min-height: 100% !important;
  }

  .system-body {
    position: relative;
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  header {
    position: sticky;
    top: 0;
    z-index: 100;
    height: auto;
    min-height: 56px;
    padding: 10px 16px;
    padding-top: max(10px, env(safe-area-inset-top));
    flex-wrap: wrap;
    gap: 10px;
  }

  .header-left, .header-right {
    flex-wrap: wrap;
    gap: 8px;
  }

  .header-left {
    flex: 1 1 100%;
    justify-content: space-between;
  }

  .header-right {
    flex: 1 1 100%;
    justify-content: flex-end;
  }

  .system-title {
    font-size: 16px;
  }

  .user-display {
    font-size: 12px;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-text-full { display: none; }
  .btn-text-short { display: inline; }

  .container {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
    padding: 12px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    gap: 12px;
  }

  .main-hall {
    height: auto;
    min-height: 320px;
    max-height: 55vh;
  }

  .hall-title {
    padding: 12px 16px;
    font-size: 15px;
  }

  .table-wrapper {
    overflow-x: auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    padding: 0 12px 12px;
  }

  table {
    min-width: 640px;
  }

  th, td {
    padding: 10px 6px;
    font-size: 13px;
  }

  .sidebar {
    height: auto;
    overflow: visible;
  }

  .card {
    padding: 14px;
  }

  .card h3 {
    font-size: 15px;
  }

  .btn {
    min-height: 36px;
    padding: 8px 10px;
    font-size: 12px;
  }

  .btn-logout {
    padding: 6px 10px;
  }

  .ratio-chip {
    padding: 4px 6px;
    margin-left: 4px;
  }

  input[type="number"] {
    width: 52px;
    padding: 6px 4px;
    font-size: 14px;
  }

  .js-smart-tooltip {
    max-width: calc(100vw - 24px);
    white-space: normal;
    word-break: break-word;
  }
}

@media (max-width: 480px) {
  header {
    padding: 8px 12px;
  }

  .header-right {
    justify-content: space-between;
  }

  .user-display {
    order: -1;
    flex: 1 1 100%;
    max-width: none;
    text-align: left;
  }

  .system-title {
    font-size: 15px;
  }

  .container {
    padding: 8px;
  }

  .main-hall {
    max-height: 50vh;
  }

  table {
    min-width: 580px;
  }
}
</style>