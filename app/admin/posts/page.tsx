import { redirect } from "next/navigation";
export default function PostsRedirect() {
  redirect("/admin/content?tab=articles");
}
