import { PageLayout } from "@/components/PageLayout";
import { useRouter } from "next/router";
import ZechubProposalDetailPage from "@/pages/ZechubProposalDetailPage";

export default function ZechubProposalRoute() {
  const router = useRouter();
  const id = typeof router.query.id === "string" ? router.query.id : "";
  if (!router.isReady) {
    return (
      <PageLayout className="animate-pulse">
        <div className="h-8 w-48 rounded bg-secondary" />
      </PageLayout>
    );
  }
  return <ZechubProposalDetailPage id={id} />;
}
