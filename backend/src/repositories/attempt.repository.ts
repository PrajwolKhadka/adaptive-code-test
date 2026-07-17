import { AttemptModel } from "../models/index.models";
import { Types } from "mongoose";

export class AttemptRepository {
  create(data: any) {
    return AttemptModel.create(data);
  }

  findByTest(testId: Types.ObjectId) {
    return AttemptModel.find({ testId }).sort({ createdAt: 1 });
  }

  answeredQuestionIds(testId: Types.ObjectId) {
    return AttemptModel.find({ testId }).distinct("questionId");
  }

  // Relies on the unique {testId, questionId} index on the Attempt schema
  // as the hard backstop; this check is the fast-path/early-exit so we
  // return a clean 400 instead of a raw duplicate-key error.
  async hasAnswered(testId: Types.ObjectId, questionId: Types.ObjectId) {
    const existing = await AttemptModel.findOne({ testId, questionId });
    return !!existing;
  }
}
