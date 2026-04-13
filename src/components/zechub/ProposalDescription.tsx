import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline-offset-2 hover:underline"
      {...props}
    >
      {children}
    </a>
  ),
};

/**
 * Renders proposal body from the indexer as markdown (GFM): headings, lists, links, code, tables.
 */
export function ProposalDescription({ text }: { text: string }) {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    return (
      <p className="text-sm italic text-muted-foreground">No description provided.</p>
    );
  }

  return (
    <div
      className={
        "max-w-none text-muted-foreground prose prose-invert prose-sm " +
        "prose-headings:text-foreground prose-strong:text-foreground prose-p:leading-relaxed " +
        "prose-a:break-words prose-pre:bg-secondary prose-pre:text-foreground " +
        "prose-code:text-foreground prose-code:bg-secondary/80 prose-code:rounded prose-code:px-1 prose-code:py-0.5 " +
        "prose-table:border-border prose-th:border-border prose-td:border-border"
      }
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {trimmed}
      </ReactMarkdown>
    </div>
  );
}
