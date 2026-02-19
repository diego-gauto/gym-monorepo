import React from "react";

type Props = {
  className?: string;
};

export default function GoogleMark({ className }: Props) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      className={className}
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.82-.07-1.61-.22-2.36H12v4.47h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.28-2.1 3.57-5.2 3.57-8.74Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.88-3c-1.08.72-2.47 1.15-4.07 1.15-3.12 0-5.76-2.1-6.7-4.92h-4v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.33a7.2 7.2 0 0 1 0-4.66v-3.1h-4a12 12 0 0 0 0 10.86l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.77 0 3.35.6 4.6 1.79l3.45-3.45A11.94 11.94 0 0 0 12 0 12 12 0 0 0 1.3 6.57l4 3.1C6.23 6.87 8.88 4.77 12 4.77Z"
      />
    </svg>
  );
}
