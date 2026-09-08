import { defineComponent } from 'vue'
import { provideTicketListContext } from '@/features/ticket-list/ticketListContext'
import { useTicketListController } from '@/features/ticket-list/useTicketListController'
import TicketListShell from './ticket-list/TicketListShell'

export default defineComponent({
  name: 'TicketList',
  setup() {
    provideTicketListContext(useTicketListController())

    return () => <TicketListShell />
  },
})
