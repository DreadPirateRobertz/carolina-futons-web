// Mega-menu panel data (cf-l6aj.11).
// Each top-level PRIMARY_NAV item that has an entry here gets a hover/focus
// panel with a featured image and optional sub-links. Items without an entry
// remain plain links (no panel).

export type MegaMenuPanel = {
  image: string;
  imageAlt: string;
  subLinks: ReadonlyArray<{ label: string; href: string }>;
};

export const MEGA_MENU_DATA: Readonly<Record<string, MegaMenuPanel>> = {
  "/shop/futon-frames": {
    image:
      "https://static.wixstatic.com/media/e04e89_4bea49a709a3470a8315b5acd7309b0f~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
    imageAlt: "Hardwood futon frames",
    subLinks: [
      { label: "All Futon Frames", href: "/shop/futon-frames" },
      { label: "Style Quiz", href: "/style-quiz" },
      { label: "Buying Guide", href: "/guides" },
      { label: "Design a Room", href: "/design-a-room" },
    ],
  },
  "/shop/murphy-cabinet-beds": {
    image:
      "https://static.wixstatic.com/media/e04e89_818d75df410a41e1a0721207333bc93d~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
    imageAlt: "Murphy cabinet beds",
    subLinks: [
      { label: "All Murphy Beds", href: "/shop/murphy-cabinet-beds" },
      { label: "Getting It Home", href: "/getting-it-home" },
    ],
  },
  "/shop/platform-beds": {
    image:
      "https://static.wixstatic.com/media/e04e89_8cd0de059f244e8485a600d4783caa92~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
    imageAlt: "Solid-wood platform beds",
    subLinks: [
      { label: "All Platform Beds", href: "/shop/platform-beds" },
      { label: "Getting It Home", href: "/getting-it-home" },
    ],
  },
  "/shop/mattresses": {
    image:
      "https://static.wixstatic.com/media/e04e89_55ecd0dfe1d5498b8a3f8cb583d5089b~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
    imageAlt: "Futon and bed mattresses",
    subLinks: [
      { label: "All Mattresses", href: "/shop/mattresses" },
      { label: "Mattresses on Sale", href: "/shop/mattresses-sale" },
      { label: "Buying Guide", href: "/guides" },
    ],
  },
  "/shop/mattresses-sale": {
    image:
      "https://static.wixstatic.com/media/e04e89_9a21133f83c3412ebe88d2f232c56cf9~mv2.jpg/v1/fill/w_600,h_400,q_90/file.jpg",
    imageAlt: "Mattresses on sale",
    subLinks: [
      { label: "All Sale Items", href: "/shop/sale" },
      { label: "Mattresses on Sale", href: "/shop/mattresses-sale" },
    ],
  },
};
