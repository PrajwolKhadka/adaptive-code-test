import { UserModel, TestModel, AttemptModel, Role } from "../models/index.models";

export class AdminRepository {
  async countUsers() {
    return UserModel.countDocuments({ role: Role.STUDENT });
  }

  async countTests() {
    return TestModel.countDocuments();
  }

  async countCompletedTests() {
    return TestModel.countDocuments({ status: "completed" });
  }

  async averageTheta(): Promise<number> {
    const result = await UserModel.aggregate([{ $match: { role: Role.STUDENT } }, { $group: { _id: null, avg: { $avg: "$theta" } } }]);
    return result[0]?.avg ?? 0;
  }

  /** Theta distribution bucketed for a histogram — one bucket per half-point of the -2..2 scale. */
  async thetaDistribution() {
    return UserModel.aggregate([
      { $match: { role: Role.STUDENT } },
      {
        $bucket: {
          groupBy: "$theta",
          boundaries: [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.01],
          default: "other",
          output: { count: { $sum: 1 } },
        },
      },
    ]);
  }

  /** Tests completed per day for the last 14 days — activity-over-time chart. */
  async testsCompletedPerDay() {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    return TestModel.aggregate([
      { $match: { status: "completed", completedAt: { $gte: fourteenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }

  /** Correctness rate by difficulty — shows whether easy/hard questions are well-calibrated. */
  async correctnessByDifficulty() {
    return AttemptModel.aggregate([
      {
        $group: {
          _id: "$difficultyAtAttempt",
          avgCorrectness: { $avg: "$effectiveCorrectness" },
          count: { $sum: 1 },
        },
      },
    ]);
  }

  listStudents() {
    return UserModel.find({ role: Role.STUDENT })
      .select("email exp theta isEmailVerified mfaEnabled createdAt lockedUntil")
      .sort({ createdAt: -1 });
  }

  deleteUser(id: string) {
    return UserModel.findByIdAndDelete(id);
  }

  findUserRole(id: string) {
    return UserModel.findById(id).select("role");
  }
}
