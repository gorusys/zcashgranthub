import Link from "next/link";
import Head from "next/head";
import {
  ArrowLeft,
  BookOpen,
  ExternalLink,
  FileEdit,
  Shield,
  Vote,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  zechubDaoCreateProposalUrl,
  zechubDaoDaodaoUrl,
} from "@/lib/daodao/zechubConfig";

const DAO_DOCS = "https://docs.daodao.zone/";
const DAO_PREFILL_DOCS =
  "https://docs.daodao.zone/dao-governance/proposals/autofill-proposal-link";
const ZECHUB_WIKI_DAO = "https://zechub.wiki/dao";

export default function ZechubDaoGuidePage() {
  const daoUrl = zechubDaoDaodaoUrl();
  const createUrl = zechubDaoCreateProposalUrl();

  return (
    <div className="container mx-auto min-w-0 px-4 py-6 sm:py-8">
      <Head>
        <title>Create & vote · ZecHub DAO · Zcash Grants Hub</title>
        <meta
          name="description"
          content="How to create ZecHub DAO proposals and vote using DAO DAO on Juno—wallet, links, and steps."
        />
      </Head>

      <Link
        href="/zechub/proposals"
        className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to proposals
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          ZecHub DAO: create proposals & vote
        </h1>
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          ZecHub uses{" "}
          <a
            href={DAO_DOCS}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline-offset-2 hover:underline"
          >
            DAO DAO
          </a>{" "}
          on <span className="font-medium text-foreground/90">Juno</span>. This site only lists
          proposals from the indexer—you{" "}
          <span className="font-medium text-foreground/90">
            connect a wallet on DAO DAO
          </span>{" "}
          to create or vote. Nothing here signs transactions.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" className="gap-2" asChild>
            <a href={createUrl} target="_blank" rel="noopener noreferrer">
              <FileEdit className="h-4 w-4" />
              Create proposal on DAO DAO
            </a>
          </Button>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <a href={daoUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
              Open ZecHub DAO
            </a>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Context
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              <a
                href={ZECHUB_WIKI_DAO}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground/90 underline-offset-2 hover:underline"
              >
                ZecHub DAO
              </a>{" "}
              handles on-chain mini-grants and governance separately from ZCG or Coinholder GitHub
              programs. Rules, treasury, and membership are defined on-chain in the DAO contracts.
            </p>
            <p>
              Official UI for submitting and voting is{" "}
              <span className="font-medium text-foreground/90">daodao.zone</span> (same data this hub
              reads from the indexer).
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4 text-primary" />
              Wallet & network
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Install a Cosmos wallet that supports Juno (commonly{" "}
                <a
                  href="https://www.keplr.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Keplr
                </a>{" "}
                or{" "}
                <a
                  href="https://www.leapwallet.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  Leap
                </a>
                ).
              </li>
              <li>
                Open{" "}
                <a
                  href={daoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  ZecHub on DAO DAO
                </a>{" "}
                and connect your wallet when prompted.
              </li>
              <li>
                Voting power and who may create proposals depend on this DAO’s configuration (e.g.
                staked governance tokens). Check the DAO page and{" "}
                <a
                  href={ZECHUB_WIKI_DAO}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  ZecHub DAO docs
                </a>{" "}
                for the latest policy.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileEdit className="h-4 w-4 text-primary" />
              Create a new proposal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Go to{" "}
                <a
                  href={createUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-primary underline-offset-2 hover:underline sm:text-sm"
                >
                  proposals/create
                </a>{" "}
                for this DAO (opens DAO DAO).
              </li>
              <li>
                Choose proposal type and actions (e.g. spend, contract execute) per your goal. Use
                clear title and description; markdown is supported in the DAO DAO editor.
              </li>
              <li>
                Review deposit requirements, voting duration, and fees shown in the UI, then submit
                and sign in your wallet.
              </li>
              <li>
                Optional: build{" "}
                <a
                  href={DAO_PREFILL_DOCS}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  autofill links
                </a>{" "}
                (<code className="rounded bg-secondary px-1 py-0.5 text-xs text-foreground">
                  ?prefill=
                </code>
                ) to pre-populate the form for your community.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Vote className="h-4 w-4 text-primary" />
              Vote on an active proposal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                From this hub, open any proposal and use{" "}
                <span className="font-medium text-foreground/90">Vote on DAO DAO</span> (or{" "}
                <span className="font-medium text-foreground/90">Open on DAO DAO</span>)—both go to
                the same proposal page on DAO DAO.
              </li>
              <li>
                Connect your wallet on that page. If your wallet has voting power for this DAO, you
                can cast Yes / No / Abstain (options depend on the proposal module).
              </li>
              <li>
                Pay attention to the voting end time shown on the proposal and in this hub’s
                sidebar when voting is open.
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-primary" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Only approve transactions you understand. Official DAO DAO UI is{" "}
              <span className="font-mono text-foreground/90">daodao.zone</span>. This grants hub never
              asks for seed phrases or private keys.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
