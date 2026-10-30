import { useUi } from "./useUi";

/** Rich interface copy declared outside a component, such as application terms. */
export function UiText({ text }: { text: string }) {
  const { text: translate } = useUi();
  return <>{translate(text)}</>;
}
