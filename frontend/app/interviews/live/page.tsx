import { redirect } from "next/navigation"

export default function LiveInterviewPage() {
  redirect("/interviews/new?mode=live")
}
