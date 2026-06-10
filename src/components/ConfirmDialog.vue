<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div
        v-if="open"
        class="confirm-overlay"
        role="presentation"
        @click.self="emitCancel"
      >
        <div
          class="confirm-dialog"
          role="alertdialog"
          :aria-labelledby="titleId"
          :aria-describedby="hasBodyContent ? descId : undefined"
        >
          <div class="confirm-icon" :class="`confirm-icon--${variant}`" aria-hidden="true">
            <svg v-if="variant === 'danger'" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg v-else-if="variant === 'warning'" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"
                stroke="currentColor"
                stroke-width="1.75"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.75" />
              <path d="M12 8v5M12 16h.01" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
            </svg>
          </div>

          <h3 :id="titleId" class="confirm-title">{{ title }}</h3>

          <div v-if="hasBodyContent" :id="descId" class="confirm-body">
            <p v-if="description" class="confirm-desc">{{ description }}</p>

            <dl v-if="facts.length" class="confirm-facts">
              <div v-for="(fact, index) in facts" :key="index" class="confirm-fact">
                <dt>{{ fact.label }}</dt>
                <dd :class="{ 'confirm-fact__value--emphasis': fact.emphasis }">{{ fact.value }}</dd>
              </div>
            </dl>

            <ul v-if="items.length" class="confirm-list">
              <li v-for="(item, index) in items" :key="index">{{ item }}</li>
            </ul>
          </div>

          <div class="confirm-actions" :class="{ 'confirm-actions--single': mode === 'notice' }">
            <button
              v-if="mode !== 'notice'"
              ref="cancelButtonRef"
              type="button"
              class="confirm-btn confirm-btn--ghost"
              @click="emitCancel"
            >
              {{ cancelText }}
            </button>
            <button
              ref="confirmButtonRef"
              type="button"
              class="confirm-btn"
              :class="confirmButtonClass"
              @click="emitConfirm"
            >
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  items: { type: Array, default: () => [] },
  facts: { type: Array, default: () => [] },
  confirmText: { type: String, default: '确定' },
  cancelText: { type: String, default: '取消' },
  mode: {
    type: String,
    default: 'confirm',
    validator: (value) => ['confirm', 'notice'].includes(value),
  },
  variant: {
    type: String,
    default: 'primary',
    validator: (value) => ['primary', 'warning', 'danger'].includes(value),
  },
})

const emit = defineEmits(['update:open', 'confirm', 'cancel'])

const titleId = `confirm-title-${Math.random().toString(36).slice(2, 9)}`
const descId = `confirm-desc-${Math.random().toString(36).slice(2, 9)}`
const cancelButtonRef = ref(null)
const confirmButtonRef = ref(null)

const hasBodyContent = computed(
  () => Boolean(props.description) || props.items.length > 0 || props.facts.length > 0,
)

const confirmButtonClass = computed(() => {
  if (props.variant === 'danger') return 'confirm-btn--danger'
  if (props.variant === 'warning') return 'confirm-btn--warning'
  return 'confirm-btn--primary'
})

function emitCancel() {
  emit('update:open', false)
  emit('cancel')
}

function emitConfirm() {
  emit('update:open', false)
  emit('confirm')
}

function onKeydown(event) {
  if (!props.open) return
  if (event.key === 'Escape') {
    emitCancel()
    return
  }
  if (event.key === 'Enter' && props.mode === 'notice') {
    event.preventDefault()
    emitConfirm()
  }
}

function focusDefaultButton() {
  const target = props.mode === 'notice' ? confirmButtonRef.value : cancelButtonRef.value
  target?.focus()
}

watch(
  () => props.open,
  (isOpen) => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    if (isOpen) {
      nextTick(() => focusDefaultButton())
    }
  },
)

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
}

.confirm-dialog {
  width: 100%;
  max-width: 420px;
  padding: 24px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 20px 40px -12px rgba(15, 23, 42, 0.25);
  box-sizing: border-box;
}

.confirm-icon {
  width: 44px;
  height: 44px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.confirm-icon svg {
  width: 24px;
  height: 24px;
}

.confirm-icon--danger {
  background: #fef2f2;
  color: #dc2626;
}

.confirm-icon--warning {
  background: #fffbeb;
  color: #d97706;
}

.confirm-icon--primary {
  background: #eff6ff;
  color: #2563eb;
}

.confirm-title {
  margin: 0 0 12px;
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
  text-align: center;
  line-height: 1.35;
}

.confirm-body {
  margin-bottom: 20px;
}

.confirm-desc {
  margin: 0 0 12px;
  font-size: 14px;
  line-height: 1.6;
  color: #64748b;
  text-align: center;
}

.confirm-body > .confirm-desc:last-child {
  margin-bottom: 0;
}

.confirm-facts {
  margin: 0;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.confirm-fact {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  line-height: 1.5;
}

.confirm-fact + .confirm-fact {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #e2e8f0;
}

.confirm-fact dt {
  margin: 0;
  color: #64748b;
  flex-shrink: 0;
}

.confirm-fact dd {
  margin: 0;
  color: #0f172a;
  font-weight: 600;
  text-align: right;
}

.confirm-fact__value--emphasis {
  color: #d97706;
}

.confirm-list {
  margin: 12px 0 0;
  padding: 12px 12px 12px 28px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.65;
  color: #475569;
}

.confirm-body > .confirm-list:first-child {
  margin-top: 0;
}

.confirm-list li + li {
  margin-top: 8px;
}

.confirm-actions {
  display: flex;
  gap: 10px;
}

.confirm-actions--single .confirm-btn {
  flex: 1;
}

.confirm-btn {
  flex: 1;
  min-height: 40px;
  padding: 0 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.confirm-btn--ghost {
  background: #fff;
  color: #475569;
  border: 1px solid #cbd5e1;
}

.confirm-btn--ghost:hover {
  background: #f8fafc;
  border-color: #94a3b8;
}

.confirm-btn--primary {
  background: #2563eb;
  color: #fff;
}

.confirm-btn--primary:hover {
  background: #1d4ed8;
}

.confirm-btn--warning {
  background: #d97706;
  color: #fff;
}

.confirm-btn--warning:hover {
  background: #b45309;
}

.confirm-btn--danger {
  background: #ef4444;
  color: #fff;
}

.confirm-btn--danger:hover {
  background: #dc2626;
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-fade-enter-active .confirm-dialog,
.confirm-fade-leave-active .confirm-dialog {
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-from .confirm-dialog,
.confirm-fade-leave-to .confirm-dialog {
  transform: scale(0.96) translateY(8px);
  opacity: 0;
}

@media (max-width: 480px) {
  .confirm-overlay {
    align-items: flex-end;
    padding: 12px;
  }

  .confirm-dialog {
    border-radius: 12px 12px 0 0;
  }

  .confirm-actions:not(.confirm-actions--single) {
    flex-direction: column-reverse;
  }
}
</style>
