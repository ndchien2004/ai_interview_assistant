import { AdminCoursesView } from "@/components/views/admin/admin-courses-view"
import { AppShell } from "@/components/common/app-shell"

export default function AdminCourseDetailPage() {
  return (
    <AppShell>
      <AdminCoursesView mode="detail" />
    </AppShell>
  )
}
