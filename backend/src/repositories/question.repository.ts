import { QuestionModel, Difficulty } from "../models/index.models";
import { Types } from "mongoose";

export class QuestionRepository {
  create(data: any, createdBy: Types.ObjectId) {
    return QuestionModel.create({ ...data, createdBy });
  }

  findById(id: string | Types.ObjectId) {
    return QuestionModel.findById(id);
  }

  update(id: string | Types.ObjectId, data: any) {
    return QuestionModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  // Soft delete — preserves referential integrity for Attempts/Tests that
  // already reference this question (hard delete would orphan historical
  // data and break report/audit trails).
  softDelete(id: string | Types.ObjectId) {
    return QuestionModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  listAll(filter: { difficulty?: Difficulty; isActive?: boolean } = {}) {
    return QuestionModel.find(filter).sort({ createdAt: -1 });
  }

  findManyByIds(ids: (string | Types.ObjectId)[]) {
    return QuestionModel.find({ _id: { $in: ids } });
  }

  countByDifficulty(difficulty: Difficulty) {
    return QuestionModel.countDocuments({ difficulty, isActive: true });
  }

  incrementExposure(id: string | Types.ObjectId) {
    return QuestionModel.updateOne({ _id: id }, { $inc: { exposureCount: 1 } });
  }

  findActiveByDifficulty(difficulty: Difficulty) {
    return QuestionModel.find({ difficulty, isActive: true });
  }
}
