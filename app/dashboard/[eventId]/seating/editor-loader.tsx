"use client";
import dynamic from "next/dynamic";
import type { EditorProps } from "./editor";

const Editor = dynamic(() => import("./editor").then((m) => m.SeatingEditor), {
  ssr: false,
  loading: () => <div className="h-[600px] animate-pulse rounded-xl bg-stone-100" />,
});

export function EditorLoader(props: EditorProps) {
  return <Editor {...props} />;
}
