export type TicketDevStatusPullRequestStatus = 'OPEN' | 'MERGED' | 'DECLINED' | 'DRAFT' | 'UNKNOWN'

export interface TicketDevStatusPullRequest {
  id: string
  name: string
  url: string
  status: TicketDevStatusPullRequestStatus
  sourceBranch: string
  destinationBranch: string
  repositoryName: string
  commentCount: number
  lastUpdate: string | null
}

export interface TicketDevStatus {
  ticketKey: string
  pullRequests: TicketDevStatusPullRequest[]
}
