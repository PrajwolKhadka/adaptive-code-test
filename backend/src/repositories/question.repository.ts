import { QuestionModel, Difficulty } from "../models/index.models";
import { Types } from "mongoose";

export class QuestionRepository {
  create(data: any, createdBy: Types.ObjectId) {
    return QuestionModel.create({ ...data, createdBy });
  }

  insertMany(items: any[], createdBy: Types.ObjectId) {
    return QuestionModel.insertMany(
      items.map((item) => ({ ...item, createdBy })),
      { ordered: false },
    );
  }

  findById(id: string | Types.ObjectId) {
    return QuestionModel.findById(id);
  }

  update(id: string | Types.ObjectId, data: any) {
    return QuestionModel.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

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