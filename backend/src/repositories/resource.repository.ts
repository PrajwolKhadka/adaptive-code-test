import { ResourceModel, ResourceType } from "../models/index.models";
import { Types } from "mongoose";

export class ResourceRepository {
  createVideo(data: { title: string; description: string; youtubeVideoId: string; uploadedBy: Types.ObjectId }) {
    return ResourceModel.create({ ...data, type: ResourceType.VIDEO });
  }

  createPdf(data: {
    title: string;
    description: string;
    storedFileName: string;
    originalFileName: string;
    fileSizeBytes: number;
    uploadedBy: Types.ObjectId;
  }) {
    return ResourceModel.create({ ...data, type: ResourceType.PDF });
  }

  findById(id: string) {
    return ResourceModel.findById(id);
  }

  listActive() {
    return ResourceModel.find({ isActive: true }).sort({ createdAt: -1 });
  }

  listAllForAdmin() {
    return ResourceModel.find().sort({ createdAt: -1 });
  }

  softDelete(id: string) {
    return ResourceModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }
}
