import type {
  TicketDevStatus,
  TicketDevStatusPullRequest,
  TicketDevStatusPullRequestStatus,
} from '../shared/devStatus'
import { isRecord } from '../shared/typeGuards'
import { jiraFetch } from './jiraClient'

const DEV_STATUS_BASE_PATH = '/rest/dev-status/latest'

const PULL_REQUEST_STATUSES: ReadonlySet<string> = new Set<TicketDevStatusPullRequestStatus>(['OPEN', 'MERGED', 'DECLINED', 'DRAFT'])

function isPullRequestStatus(value: string): value is TicketDevStatusPullRequestStatus {
  return PULL_REQUEST_STATUSES.has(value)
}

async function getIssueId(ticketKey: string): Promise<string> {
  const issue = await jiraFetch(`/issue/${ticketKey}`, {
    params: { fields: 'summary' },
  })

  if (!isRecord(issue) || typeof issue.id !== 'string' || !issue.id) {
    throw new Error(`Could not resolve Jira issue id for ${ticketKey}.`)
  }

  return issue.id
}

/**
 * The dev-status detail endpoint requires an applicationType that matches the
 * connected dev tool (e.g. "oAuth-com.github.integration.production" for the
 * GitHub Cloud app). The summary response lists the instance types that hold
 * pull request data, so we read them from there instead of hardcoding one.
 */
function extractPullRequestInstanceTypes(summary: unknown): string[] {
  if (!isRecord(summary) || !isRecord(summary.summary)) {
    return []
  }

  const pullRequestSummary = summary.summary.pullrequest
  if (!isRecord(pullRequestSummary) || !isRecord(pullRequestSummary.byInstanceType)) {
    return []
  }

  return Object.keys(pullRequestSummary.byInstanceType)
}

function parsePullRequestStatus(value: unknown): TicketDevStatusPullRequestStatus {
  return typeof value === 'string' && isPullRequestStatus(value)
    ? value
    : 'UNKNOWN'
}

function parseBranchName(value: unknown): string {
  return isRecord(value) && typeof value.branch === 'string' ? value.branch : ''
}

function parsePullRequest(value: unknown): TicketDevStatusPullRequest | null {
  if (!isRecord(value) || typeof value.url !== 'string' || !value.url) {
    return null
  }

  return {
    id: typeof value.id === 'string' ? value.id : value.url,
    name: typeof value.name === 'string' ? value.name : value.url,
    url: value.url,
    status: parsePullRequestStatus(value.status),
    sourceBranch: parseBranchName(value.source),
    destinationBranch: parseBranchName(value.destination),
    repositoryName: typeof value.repositoryName === 'string' ? value.repositoryName : '',
    commentCount: typeof value.commentCount === 'number' ? value.commentCount : 0,
    lastUpdate: typeof value.lastUpdate === 'string' ? value.lastUpdate : null,
  }
}

function extractPullRequests(detail: unknown): TicketDevStatusPullRequest[] {
  if (!isRecord(detail) || !Array.isArray(detail.detail)) {
    return []
  }

  const pullRequests: TicketDevStatusPullRequest[] = []
  for (const entry of detail.detail) {
    if (!isRecord(entry) || !Array.isArray(entry.pullRequests)) {
      continue
    }

    for (const rawPullRequest of entry.pullRequests) {
      const pullRequest = parsePullRequest(rawPullRequest)
      if (pullRequest && !pullRequests.some(existing => existing.url === pullRequest.url)) {
        pullRequests.push(pullRequest)
      }
    }
  }

  return pullRequests
}

export async function getTicketDevStatus(ticketKey: string): Promise<TicketDevStatus> {
  const issueId = await getIssueId(ticketKey)
  const summary = await jiraFetch('/issue/summary', {
    basePath: DEV_STATUS_BASE_PATH,
    params: { issueId },
  })

  const instanceTypes = extractPullRequestInstanceTypes(summary)
  const results = await Promise.allSettled(instanceTypes.map(applicationType => jiraFetch('/issue/detail', {
    basePath: DEV_STATUS_BASE_PATH,
    params: {
      issueId,
      applicationType,
      dataType: 'pullrequest',
    },
  })))

  // One flaky instance type must not wipe out the PRs from the others;
  // only fail outright when every detail call failed.
  const details = results
    .filter((result): result is PromiseFulfilledResult<unknown> => result.status === 'fulfilled')
    .map(result => result.value)
  const failure = results.find(result => result.status === 'rejected')
  if (failure && details.length === 0) {
    throw failure.reason
  }

  return {
    ticketKey,
    pullRequests: details.flatMap(extractPullRequests),
  }
}
