import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Markdown } from "@/components/markdown";
it("renders Markdown without HTML, embedded images or executable links", () => {
  const html = renderToStaticMarkup(<Markdown>{'# Example\n\n<script>alert(1)</script>\n\n[bad](javascript:alert%281%29) ![track](https://evil.test/image)\n\n[good](https://example.test)'}</Markdown>);
  expect(html).toContain("<h1>Example</h1>"); expect(html).not.toContain("<script"); expect(html).not.toContain("<img"); expect(html).not.toContain('href="javascript:'); expect(html).toContain('rel="noopener noreferrer"');
});
