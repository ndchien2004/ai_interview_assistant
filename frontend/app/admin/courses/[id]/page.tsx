import { AdminCoursesView } from "@/components/admin-courses-view"
import { AppShell } from "@/components/app-shell"

export default function AdminCourseDetailPage() {
  return (
    <AppShell>
      <AdminCoursesView mode="detail" />
    </AppShell>
  )
}
