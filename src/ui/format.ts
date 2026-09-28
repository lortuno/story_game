/** 83_000 → "1:23"; 3_723_000 → "1:02:03". */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = String(totalSeconds % 60).padStart(2, '0')
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`
}

/** "2020-04-23" → "23/04/2020" (es). UTC avoids the date shifting by timezone. Invalid input is shown as-is. */
export function formatStoryDate(iso: string, lang: string): string {
  const date = new Date(`${iso}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return iso
  return new Intl.DateTimeFormat(lang, { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(date)
}
