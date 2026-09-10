import { useLocalStorage } from '@vueuse/core'
import { computed, watch } from 'vue'
import { useAssistantSessions } from './useAssistantSessions'

export function useAssistantNavigation() {
  const route = useRoute()
  const router = useRouter()
  const sessions = useAssistantSessions()
  const persistedView = useLocalStorage('jira2.currentView', 'my-issues')
  const isHome = computed(() => route.path === '/' && (route.query.view ?? persistedView.value) === 'assistant')
  watch(() => route.fullPath, (path) => {
    if (!isHome.value)
      sessions.previousScreen.value = path
  }, { immediate: true })
  function expand() {
    return router.push({ path: '/', query: { view: 'assistant' } })
  }
  function moveToToolbar() {
    sessions.minimized.value = true
    return router.push(sessions.previousScreen.value ?? '/?view=my-issues')
  }
  const isWorkspace = computed(() => isHome.value || route.path === '/settings')
  return { isHome, isWorkspace, expand, moveToToolbar }
}
