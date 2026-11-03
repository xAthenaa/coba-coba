const paths: Record<string, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  map: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0",
  grid: "M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z",
  bell: "M6 16V11a6 6 0 1 1 12 0v5l2 2H4zm4 4a2 2 0 0 0 4 0",
  back: "M15 5 8 12l7 7",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.5-4.5",
  qr: "M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm-2-2h2v2h-2z",
  locate: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm0-6v3m0 14v3M2 12h3m14 0h3",
  close: "M6 6l12 12M18 6 6 18",
  check: "m5 12 5 5 9-10",
  calendar: "M4 6h16v14H4zm0 4h16M8 3v4m8-4v4",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z",
  plus: "M12 5v14M5 12h14",
  trash: "M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13",
  edit: "M4 20h4L19 9l-4-4L4 16zm10-14 4 4",
  download: "M12 4v11m-5-5 5 5 5-5M5 20h14",
  share: "M16 6l-4-3-4 3m4-3v13M5 12v8h14v-8",
  print: "M7 9V3h10v6M6 18H4v-8h16v8h-2M7 14h10v7H7z",
  flash: "M13 2 4 14h7l-1 8 9-12h-7z",
  gear: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8-3 2-1-2-4-2 .5-1.5-1L16 4h-4l-.5 2.5-1.5 1L8 7 6 11l2 1-2 1 2 4 2-.5 1.5 1L12 20h4l.5-2.5 1.5-1 2 .5 2-4z",
  logout: "M15 4h4v16h-4M10 16l4-4-4-4m4 4H3",
  help: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm-2.5-12a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14m0 3h.01",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-10v6m0-9h.01",
  camera: "M4 8h3l2-3h6l2 3h3v12H4zm8 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  wifi: "M2 9a15 15 0 0 1 20 0M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 20h.01",
  chevron: "m9 5 7 7-7 7",
  arrowUp: "M12 20V4m-6 6 6-6 6 6",
  arrowLeft: "M20 12H4m6-6-6 6 6 6",
  arrowRight: "M4 12h16m-6-6 6 6-6 6",
};
export type IconName = keyof typeof paths;
export function Icon({ name, size = 22, className = "", strokeWidth = 2 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={paths[name] ?? paths.info} />
    </svg>
  );
}
