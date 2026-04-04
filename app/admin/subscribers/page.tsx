import { redirect } from "next/navigation";
export default function SubscribersRedirect() {
  redirect("/admin/growth?tab=subscribers");
}
