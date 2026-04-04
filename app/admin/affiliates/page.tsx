import { redirect } from "next/navigation";
export default function AffiliatesRedirect() {
  redirect("/admin/marketplace?tab=affiliates");
}
