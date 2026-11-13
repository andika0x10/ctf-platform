import type { ReactNode, SVGProps } from "react";

export function PixelFlag(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}><path d="M6 3h2v26H6zM8 3h16v2H8zM8 5h4v4H8zm8 0h4v4h-4zm-4 4h4v4h-4zm8 0h4v4h-4zM8 13h4v4H8zm8 0h4v4h-4zM24 5h2v14h-2zM8 17h16v2H8z" /></svg>;
}
export function Chevron({ open = false }: { open?: boolean }) {
  return <svg className="chevron" data-open={open} width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="m2 4 4 4 4-4" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
export function ArrowIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M8 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" /></svg>;
}
export function CategoryIcon({ category }: { category: string }) {
  const shapes: Record<string, ReactNode> = {
    web: <><rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M7 6.5h1M10 6.5h1M8 13l-2 2 2 2m8-4 2 2-2 2"/></>,
    crypto: <><path d="M7 10V7a5 5 0 0 1 10 0v3"/><rect x="5" y="10" width="14" height="11" rx="1"/><path d="M12 14v3"/></>,
    forensics: <><circle cx="10" cy="10" r="6"/><path d="m15 15 6 6M7 10h6M10 7v6"/></>,
    reverse: <><path d="M5 4v6h6M5 10a7 7 0 1 1 0 7M10 10l-2 4h6l-2 4"/></>,
    misc: <><path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm13 0v6m-3-3h6"/></>,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" aria-hidden="true">{shapes[category] || shapes.misc}</svg>;
}
