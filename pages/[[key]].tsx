import { defineComponent } from 'vue'
import TicketList from '@/components/TicketList'

definePageMeta({ key: 'ticket-workspace' })

export default defineComponent({
  name: 'TicketWorkspacePage',
  setup() {
    return () => <TicketList />
  },
})
