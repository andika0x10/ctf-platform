import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function Markdown({ children }: { children: string }) {
  return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml disallowedElements={["img"]} components={{ a: ({ children: label, href }) => <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{label}</a> }}>{children}</ReactMarkdown></div>;
}
