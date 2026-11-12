export interface Theme {
  id: string;
  name: string;
  /** CSS custom properties applied on the public site root. */
  vars: Record<string, string>;
  headingFont: string;
}

export const THEMES: Record<string, Theme> = {
  classic: {
    id: "classic",
    name: "Classic",
    headingFont: "'Cormorant Garamond', Georgia, serif",
    vars: { "--site-bg": "#fbf8f3", "--site-fg": "#3b3530", "--site-accent": "#a67c52", "--site-muted": "#efe7dc" },
  },
  modern: {
    id: "modern",
    name: "Modern",
    headingFont: "'Inter', system-ui, sans-serif",
    vars: { "--site-bg": "#ffffff", "--site-fg": "#111827", "--site-accent": "#2563eb", "--site-muted": "#f1f5f9" },
  },
  garden: {
    id: "garden",
    name: "Garden",
    headingFont: "'Playfair Display', Georgia, serif",
    vars: { "--site-bg": "#f4f7f2", "--site-fg": "#27352b", "--site-accent": "#5d7f5a", "--site-muted": "#e2eadf" },
  },
};

export const getTheme = (id: string | null | undefined): Theme => THEMES[id ?? ""] ?? THEMES.classic;
