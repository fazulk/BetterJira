<script setup lang="ts">
import { provideTicketListContext } from '@/features/ticket-list/ticketListContext'
import { useTicketListController } from '@/features/ticket-list/useTicketListController'
import TicketListShell from './ticket-list/TicketListShell.vue'

provideTicketListContext(useTicketListController())
</script>

<template>
  <TicketListShell />
</template>
