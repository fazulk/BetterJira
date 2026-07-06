import type { InjectionKey } from 'vue'
import type { TicketListController } from './useTicketListController'
import { inject, provide } from 'vue'

const ticketListContextKey: InjectionKey<TicketListController> = Symbol('ticket-list-context')

export function provideTicketListContext(controller: TicketListController): void {
  provide(ticketListContextKey, controller)
}

export function useTicketListContext(): TicketListController {
  const controller = inject(ticketListContextKey)
  if (!controller) {
    throw new Error('Ticket list context was not provided.')
  }
  return controller
}
