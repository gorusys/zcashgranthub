import { useRouter } from "next/router";
import ZechubProposalDetailPage from "@/pages/ZechubProposalDetailPage";

export default function ZechubProposalRoute() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  if (!router.isReady) {
    return (
      <div className="container mx-auto animate-pulse px-4 py-8">
        <div className="h-8 w-48 rounded bg-secondary" />
      </div>
    );
  }
  return <ZechubProposalDetailPage id={id} />;
}
