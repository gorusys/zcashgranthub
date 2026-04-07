import { Link } from "react-router-dom";
import {
  ArrowRight,
  Shield,
  Code,
  Globe,
  BookOpen,
  FlaskConical,
  Users,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { GrantCard } from "@/components/GrantCard";
import { useGrants } from "@/hooks/useGrants";
import { useEffect, useRef, useState } from "react";

function AnimatedCounter({
  target,
  prefix = "",
  suffix = "",
}: {
  target: number;
  prefix?: string;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || target === 0) return;
    const duration = 1500;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [started, target]);

  return (
    <div ref={ref} className="text-3xl font-bold text-primary lg:text-4xl">
      {prefix}
      {target >= 1_000_000
        ? `${(count / 1_000_000).toFixed(1)}M`
        : count.toLocaleString()}
      {suffix}
    </div>
  );
}

const fundingCategories = [
  {
    icon: Shield,
    title: "Wallets & SDKs",
    desc: "User-facing wallet applications and developer toolkits",
  },
  {
    icon: Code,
    title: "Core Infrastructure",
    desc: "Node software, consensus, and protocol-level improvements",
  },
  {
    icon: Globe,
    title: "Interoperability",
    desc: "Cross-chain bridges and integration protocols",
  },
  {
    icon: BookOpen,
    title: "Education & Media",
    desc: "Content, courses, and awareness campaigns",
  },
  {
    icon: FlaskConical,
    title: "Research & Development",
    desc: "Cryptographic research and formal verification",
  },
  {
    icon: Users,
    title: "Community & Events",
    desc: "Meetups, conferences, and grassroots adoption",
  },
];

const howItWorks = [
  {
    step: 1,
    title: "Submit Application",
    desc: "Fill out the comprehensive grant application form with project details, budget, and milestones.",
  },
  {
    step: 2,
    title: "Community Review",
    desc: "The Zcash community reviews and provides feedback on your proposal for one week.",
  },
  {
    step: 3,
    title: "Committee Review",
    desc: "ZCG committee members evaluate the application during their bi-weekly meeting.",
  },
  {
    step: 4,
    title: "Application Finalized",
    desc: "Committee votes on approval. Applicant may be asked for revisions.",
  },
  {
    step: 5,
    title: "Grant Agreement & Payments",
    desc: "Sign the grant agreement and receive milestone-based payments as you deliver.",
  },
];

export default function LandingPage() {
  const { data: grants = [], isLoading } = useGrants();

  // Derive live stats from real data
  const totalGrants = grants.length;
  const activeGrants = grants.filter((g) =>
    ["ACTIVE", "APPROVED"].includes(g.status)
  ).length;
  const totalDisbursed = grants.reduce((s, g) => s + g.amountPaid, 0);

  // Show up to 4 recently active/approved/committee-review grants
  const recentGrants = grants
    .filter((g) =>
      ["ACTIVE", "APPROVED", "COMMITTEE_REVIEW", "COMMUNITY_REVIEW"].includes(
        g.status
      )
    )
    .slice(0, 4);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="grid-pattern absolute inset-0" />
        <div className="absolute left-1/2 top-1/3 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px] animate-glow-pulse" />
        <div className="relative container mx-auto px-4 py-24 text-center lg:py-36">
          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
            Fund the Future of{" "}
            <span className="text-gradient-gold">Zcash Privacy</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            The Zcash Community Grants program funds independent teams building
            the Zcash ecosystem.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link to="/apply">
              <Button
                size="lg"
                className="gap-2 bg-primary px-8 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                Submit a Grant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/grants">
              <Button size="lg" variant="outline" className="gap-2 border-border px-8">
                Browse Grants
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats — live from GitHub */}
      <section className="border-b border-border/50 bg-card/50">
        <div className="container mx-auto grid grid-cols-2 gap-6 px-4 py-12 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse text-center">
                <div className="mx-auto h-9 w-20 rounded bg-secondary" />
                <div className="mx-auto mt-2 h-3 w-32 rounded bg-secondary" />
              </div>
            ))
          ) : (
            <>
              <div className="text-center">
                <AnimatedCounter target={totalGrants} />
                <div className="mt-1 text-sm text-muted-foreground">
                  Total Grant Applications
                </div>
              </div>
              <div className="text-center">
                <AnimatedCounter target={totalDisbursed} prefix="$" />
                <div className="mt-1 text-sm text-muted-foreground">
                  Total Disbursed
                </div>
              </div>
              <div className="text-center">
                <AnimatedCounter target={activeGrants} />
                <div className="mt-1 text-sm text-muted-foreground">
                  Active Grants
                </div>
              </div>
              <div className="text-center">
                <AnimatedCounter target={11_000_000} prefix="~$" />
                <div className="mt-1 text-sm text-muted-foreground">
                  ZCG Treasury
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* What We Fund */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="mb-2 text-center text-2xl font-bold text-foreground">
          What We Fund
        </h2>
        <p className="mb-12 text-center text-muted-foreground">
          Supporting the full spectrum of Zcash ecosystem development
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fundingCategories.map((cat) => (
            <Card
              key={cat.title}
              className="border-border/50 bg-card transition-colors hover:border-primary/30"
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <cat.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{cat.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {cat.desc}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Recent Grants — real data */}
      {(recentGrants.length > 0 || isLoading) && (
        <section className="border-t border-border/50 bg-card/30">
          <div className="container mx-auto px-4 py-20">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                Recent Grant Applications
              </h2>
              <Link
                to="/grants"
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="animate-pulse rounded-lg border border-border/50 bg-card p-5"
                  >
                    <div className="mb-3 h-5 w-3/4 rounded bg-secondary" />
                    <div className="h-4 w-1/2 rounded bg-secondary" />
                    <div className="mt-3 h-7 w-20 rounded bg-secondary" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {recentGrants.map((grant) => (
                  <GrantCard key={grant.id} grant={grant} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="mb-12 text-center text-2xl font-bold text-foreground">
          How It Works
        </h2>
        <div className="mx-auto max-w-2xl">
          {howItWorks.map((item, i) => (
            <div key={item.step} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {item.step}
                </div>
                {i < howItWorks.length - 1 && (
                  <div className="mt-2 h-full w-0.5 bg-border" />
                )}
              </div>
              <div className="pb-10">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
