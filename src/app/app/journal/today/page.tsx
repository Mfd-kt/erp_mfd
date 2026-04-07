import { redirect } from 'next/navigation'

export default function JournalTodayPage() {
  const date = new Date().toISOString().slice(0, 10)
  redirect(`/app/journal/${date}`)
}
