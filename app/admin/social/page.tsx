import { redirect } from "next/navigation";
export default function SocialRedirect() {
  redirect("/admin/growth?tab=distribution");
}
