export type StackItem = {
  label: string;
  title: string;
  description: string;
  capabilities: readonly string[];
};

export const stackItems: readonly StackItem[] = [
  {
    label: "Interface",
    title: "Next.js + React",
    description:
      "Server-first rendering, fast navigation, and a lightweight component system built with native CSS.",
    capabilities: ["App Router", "React 19", "TypeScript", "CSS Modules"],
  },
  {
    label: "Server",
    title: "Full-stack actions",
    description:
      "Typed server logic lives beside the product, with clear boundaries for mutations and public endpoints.",
    capabilities: ["Server Actions", "Route Handlers", "Zod", "Node.js 24"],
  },
  {
    label: "Data + delivery",
    title: "Atlas to Netlify",
    description:
      "A managed document database and deployment platform provide a direct path from preview to production.",
    capabilities: ["MongoDB Atlas", "OpenNext", "Deploy Previews", "SSR + ISR"],
  },
];
