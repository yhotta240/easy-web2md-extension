export type Settings = {
  fileName: string;
  saveFilename: boolean;
  minImageSize: number;
};

export const DEFAULT_SETTINGS: Settings = {
  fileName: "webpage",
  saveFilename: false,
  minImageSize: 200,
};
