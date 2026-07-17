import { TestModel } from "../models/index.models";
import { Types } from "mongoose";

export class TestRepository {
  create(studentId: Types.ObjectId, questionPoolIds: Types.ObjectId[]) {
    return TestModel.create({ studentId, questionPoolIds, status: "in_progress" });
  }

  findById(id: string | Types.ObjectId) {
    return TestModel.findById(id);
  }

  // Ownership-scoped lookup — the core IDOR defense for this resource.
  // Every read/write to a Test must go through this (never findById alone)
  // so a student can't act on another student's test by guessing/enumerating IDs.
  findByIdForStudent(id: string | Types.ObjectId, studentId: Types.ObjectId) {
    return TestModel.findOne({ _id: id, studentId });
  }

  appendThetaPoint(id: Types.ObjectId, afterQuestionIndex: number, theta: number) {
    return TestModel.updateOne({ _id: id }, { $push: { thetaTrajectory: { afterQuestionIndex, theta } } });
  }

  complete(id: Types.ObjectId, aiSummary: string) {
    return TestModel.updateOne({ _id: id }, { status: "completed", completedAt: new Date(), aiSummary });
  }
}
