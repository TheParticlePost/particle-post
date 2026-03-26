import { getAllPostMeta } from "@/lib/content";
import { HomeContent } from "@/components/home-content";

export default function HomePage() {
  const articles = getAllPostMeta();

  return <HomeContent articles={articles} />;
}
