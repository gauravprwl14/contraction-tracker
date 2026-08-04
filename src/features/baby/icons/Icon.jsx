const PATHS = {
  breast: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" /></>,
  bottle: <><path d="M9.5 3h5" /><path d="M10 3v2.4A4 4 0 0 0 8.8 8.2V19a2 2 0 0 0 2 2h2.4a2 2 0 0 0 2-2V8.2A4 4 0 0 0 14 5.4V3" /><path d="M8.8 10.5h6.4" /></>,
  pee: <path d="M12 3.2 7.6 9.4a5.5 5.5 0 1 0 8.8 0z" />,
  poop: <><path d="M10.5 5.5a2 2 0 0 1 3.2 1.6" /><path d="M8.5 12a2.75 2.75 0 0 1 2.75-2.75h3A2.75 2.75 0 0 1 17 12" /><path d="M6 18.25A2.75 2.75 0 0 1 8.75 15.5h6.5A2.75 2.75 0 0 1 18 18.25 2.75 2.75 0 0 1 15.25 21h-6.5A2.75 2.75 0 0 1 6 18.25z" /></>,
  play: <path d="M8 5.5v13l10-6.5z" />,
  pause: <><path d="M9.5 5.5v13" /><path d="M14.5 5.5v13" /></>,
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  trash: <><path d="M4.5 7h15" /><path d="M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7" /><path d="M6.5 7l.8 11a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-11" /></>,
  edit: <><path d="M4.5 19.5h4L19 9a2.1 2.1 0 0 0-3-3L5.5 16.5z" /><path d="M14.5 6.5l3 3" /></>,
  filter: <><path d="M4.5 6.5h15" /><path d="M7.5 12h9" /><path d="M10.5 17.5h3" /></>,
  search: <><circle cx="11" cy="11" r="6" /><path d="M15.5 15.5 20 20" /></>,
  close: <><path d="M6.5 6.5l11 11" /><path d="M17.5 6.5l-11 11" /></>,
  'chevron-down': <path d="M6.5 9.5 12 15l5.5-5.5" />,
  'chevron-up': <path d="M6.5 14.5 12 9l5.5 5.5" />,
  undo: <><path d="M4.5 9.5h9a5.5 5.5 0 0 1 0 11H9" /><path d="M8 5.5 4 9.5l4 4" /></>,
  download: <><path d="M12 4v11" /><path d="M7.5 10.5 12 15l4.5-4.5" /><path d="M4.5 19.5h15" /></>,
  upload: <><path d="M12 19V8" /><path d="M7.5 12.5 12 8l4.5 4.5" /><path d="M4.5 4.5h15" /></>,
  chart: <><path d="M4.5 19.5h15" /><path d="M7.5 16V10" /><path d="M12 16V5.5" /><path d="M16.5 16v-4" /></>,
  list: <><path d="M4.5 7h15" /><path d="M4.5 12h15" /><path d="M4.5 17h15" /></>,
  home: <><path d="M4.5 10.5 12 4l7.5 6.5" /><path d="M6.5 9.8V19a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1V9.8" /></>,
};

export function Icon({ name, size = 20, className = '' }) {
  const children = PATHS[name];
  if (!children) return null;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}
