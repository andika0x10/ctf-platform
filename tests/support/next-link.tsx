import type { AnchorHTMLAttributes } from "react";

// Isolate the navigation's disclosure behavior from the framework router.
export default function Link(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} onClick={(event) => {
    event.preventDefault();
    props.onClick?.(event);
  }} />;
}
