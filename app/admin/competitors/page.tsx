import { redirect } from "next/navigation";
export default function CompetitorsRedirect() {
  redirect("/admin/growth?tab=competitors");
}
