import { redirect } from "next/navigation";
export default function AnalyticsRedirect() {
  redirect("/admin/growth?tab=traffic");
}
