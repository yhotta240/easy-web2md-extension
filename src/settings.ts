export type Settings = {
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
};
