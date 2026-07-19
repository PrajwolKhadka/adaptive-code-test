export interface Resource {
  _id: string;
  type: "video" | "pdf";
  title: string;
  description: string;
  youtubeVideoId?: string;
  originalFileName?: string;
  fileSizeBytes?: number;
  isActive: boolean;
  createdAt: string;
}
