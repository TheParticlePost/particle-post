import localFont from "next/font/local";

export const sora = localFont({
  src: "../public/fonts/Sora-Bold.woff2",
  weight: "700",
  style: "normal",
  display: "swap",
  variable: "--font-display",
});

export const dmSans = localFont({
  src: [
    {
      path: "../public/fonts/DMSans-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/DMSans-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/DMSans-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-body",
});

export const ibmPlexMono = localFont({
  src: [
    {
      path: "../public/fonts/IBMPlexMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/IBMPlexMono-Medium.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  display: "swap",
  variable: "--font-mono",
});
