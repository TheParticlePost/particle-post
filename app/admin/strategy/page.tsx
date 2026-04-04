import { redirect } from "next/navigation";
export default function StrategyRedirect() {
  redirect("/admin/content?tab=strategy");
}
