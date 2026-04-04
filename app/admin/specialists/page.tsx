import { redirect } from "next/navigation";
export default function SpecialistsRedirect() {
  redirect("/admin/marketplace?tab=specialists");
}
