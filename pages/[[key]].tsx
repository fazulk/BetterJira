import { defineComponent } from 'vue'
import TicketList from '@/components/TicketList.vue'

definePageMeta({ key: 'ticket-workspace' })

export default defineComponent({
  name: 'TicketWorkspacePage',
  setup() {
    return () => <TicketList />
  },
})
