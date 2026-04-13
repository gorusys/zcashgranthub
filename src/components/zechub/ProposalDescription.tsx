import { Fragment, type ReactNode } from "react";

/** Split capture groups alternate text / URL / text / URL */
const URL_SPLIT = /(https?:\/\/\S+)/g;

function linkifyLine(line: string): ReactNode[] {
  const pieces = line.split(URL_SPLIT);
  return pieces.map((piece, i) => {
    if (i % 2 === 1) {
      const href = piece;
      return (
        <a
          key={i}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-primary underline-offset-2 hover:underline"
        >
          {href}
        </a>
      );
    }
    return <Fragment key={i}>{piece}</Fragment>;
  });
}

/**
 * Renders proposal body from the indexer: paragraphs, line breaks, and linked URLs.
 */
export function ProposalDescription({ text }: { text: string }) {
  const trimmed = text?.trim() ?? "";
  if (!trimmed) {
    return (
      <p className="text-sm italic text-muted-foreground">No description provided.</p>
    );
  }

  const blocks = trimmed.split(/\n{2,}/);

  return (
    <div className="max-w-none space-y-4">
      {blocks.map((block, bi) => (
        <div key={bi} className="mb-4 last:mb-0">
          {block.split("\n").map((line, li) => (
            <p key={li} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
              {linkifyLine(line)}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
}
