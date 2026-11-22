export type ElementExclusions = {
  excludeSiteHeader: boolean;
  excludeNavigation: boolean;
  excludeSidebar: boolean;
  excludeFooter: boolean;
  excludeLinkBlocks: boolean;
  minLinkCount: number;
};

export type Settings = ElementExclusions & {
  fileName: string;
  saveFilename: boolean;
  minImageSize: number;
  preferDisplayedImageSize: boolean;
};

export const DEFAULT_SETTINGS: Settings = {
  fileName: "webpage",
  saveFilename: false,
  minImageSize: 200,
  preferDisplayedImageSize: false,
  excludeSiteHeader: true,
  excludeNavigation: true,
  excludeSidebar: true,
  excludeFooter: true,
  excludeLinkBlocks: false,
  minLinkCount: 3,
};
