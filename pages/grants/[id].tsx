import { useRouter } from "next/router";
import GrantDetailPage from "@/pages/GrantDetailPage";

export default function GrantDetailRoute() {
  const router = useRouter();
  const id =
    typeof router.query.id === "string" ? router.query.id : undefined;
  return <GrantDetailPage id={id} />;
}
