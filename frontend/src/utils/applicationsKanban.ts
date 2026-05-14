import type {
  ApplicationStatus,
  ApplicationsResponse,
  JobApplication,
} from '../types/application.types'

export function moveApplicationToStatus(
  data: ApplicationsResponse,
  appId: string,
  newStatus: string
): ApplicationsResponse {
  let moving: JobApplication | null = null
  const grouped: Record<string, JobApplication[]> = { ...data.grouped }
  for (const key of Object.keys(grouped)) {
    const list = [...(grouped[key] ?? [])]
    const idx = list.findIndex((a) => a.id === appId)
    if (idx >= 0) {
      moving = { ...list[idx], status: newStatus as ApplicationStatus }
      list.splice(idx, 1)
      grouped[key] = list
      break
    }
  }
  if (!moving) {
    return data
  }
  grouped[newStatus] = [...(grouped[newStatus] ?? []), moving]
  const flat = Object.values(grouped).flat()
  return { ...data, grouped, flat }
}

export function filterApplications(
  data: ApplicationsResponse,
  search: string,
  priority: 'all' | JobApplication['priority'],
  sort: 'last_updated' | 'applied_date' | 'match_score'
): ApplicationsResponse {
  const q = search.trim().toLowerCase()
  const grouped: Record<string, JobApplication[]> = {}
  for (const key of Object.keys(data.grouped)) {
    let list = [...(data.grouped[key] ?? [])]
    if (q) {
      list = list.filter(
        (a) =>
          a.companyName.toLowerCase().includes(q) || a.jobTitle.toLowerCase().includes(q)
      )
    }
    if (priority !== 'all') {
      list = list.filter((a) => a.priority === priority)
    }
    list.sort((a, b) => {
      if (sort === 'match_score') {
        return (b.matchScore ?? -1) - (a.matchScore ?? -1)
      }
      const da = Date.parse(sort === 'applied_date' ? (a.appliedDate ?? a.createdAt ?? '') : (a.lastUpdated ?? a.updatedAt ?? ''))
      const db = Date.parse(sort === 'applied_date' ? (b.appliedDate ?? b.createdAt ?? '') : (b.lastUpdated ?? b.updatedAt ?? ''))
      return db - da
    })
    grouped[key] = list
  }
  const flat = Object.values(grouped).flat()
  return { ...data, grouped, flat }
}
