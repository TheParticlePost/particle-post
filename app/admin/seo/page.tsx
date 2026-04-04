import { redirect } from "next/navigation";
export default function SeoRedirect() {
  redirect("/admin/growth?tab=keywords");
}
