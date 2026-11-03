/**
 * Design tokens WAYO. Sumber: /workspace/rpl/docs/design-tokens.md (Bocil, v1).
 * Ubah di sini + di src/app/globals.css (@theme) bila token diperbarui.
 */
export const tokens = {
  color: {
    primary: "#1E3A8A",
    text: "#111827",
    textSecondary: "#6B7280",
    surface: "#FFFFFF",
    border: "#E5E7EB",
    bgMuted: "#F3F4F6",
    bgSoft: "#F5F7FF",
    danger: "#DC2626",
    success: "#16A34A",
  },
  category: {
    gedung: "#1E3A8A",
    toilet: "#2563EB",
    kantin: "#F59E0B",
    event: "#DC2626",
    parkir: "#16A34A",
    info: "#7C3AED",
    stand: "#DB2777",
  } as Record<string, string>,
  layout: { frameWidth: 440, margin: 24, contentWidth: 392 },
};

export const categoryLabel: Record<string, string> = {
  gedung: "Gedung",
  event: "Event",
  kantin: "Kantin",
  toilet: "Toilet",
  parkir: "Parkir",
  info: "Info",
  stand: "Stand",
};
