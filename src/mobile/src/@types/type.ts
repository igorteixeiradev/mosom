export type Status = "idle" | "recording" | "analyzing" | "result" | "error";

export interface TrackImages {
  coverart?: string;
  coverarthq?: string;
  background?: string;
}

export interface Track {
  title: string;
  artist: string;
  shazam_url?: string;
  images?: TrackImages;
  download_endpoint?: string;
}
