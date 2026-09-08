import { defineComponent } from 'vue'
import TicketList from '@/components/TicketList'

export default defineComponent({
  name: 'TicketWorkspacePage',
  setup() {
    definePageMeta({ key: 'ticket-workspace' })

    return () => <TicketList />
  },
})
