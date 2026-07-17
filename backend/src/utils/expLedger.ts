import crypto from "crypto";
import { Types } from "mongoose";
import { ExpTransactionModel, UserModel } from "../models/index.models";
import { AppError } from "../middlewares/errorHandler.middleware";

function sign(payload: Record<string, unknown>): string {
  const secret = process.env.EXP_LEDGER_HMAC_SECRET as string;
  const data = JSON.stringify(payload);
  return crypto.createHmac("sha256", secret).update(data).digest("hex");
}

interface EarnParams {
  studentId: Types.ObjectId;
  amount: number;
  reason: "attempt_correct" | "admin_adjustment";
  relatedAttemptId?: Types.ObjectId;
}

interface SpendParams {
  studentId: Types.ObjectId;
  amount: number;
  reason: "hint_purchase";
  relatedQuestionId?: Types.ObjectId;
  relatedTestId?: Types.ObjectId;
}

export class ExpLedger {
  async earn(params: EarnParams) {
    return this.applyTransaction({ ...params, type: "earn" as const });
  }

  async spend(params: SpendParams) {
    // Balance check happens inside the transaction (see applyTransaction)
    // to avoid a TOCTOU race: two concurrent hint-purchase requests could
    // both read a sufficient balance before either commits, over-spending
    // EXP. Mongo's session-scoped transaction serializes this per user.
    return this.applyTransaction({ ...params, type: "spend" as const });
  }

  private async applyTransaction(params: {
    studentId: Types.ObjectId;
    amount: number;
    type: "earn" | "spend";
    reason: string;
    relatedAttemptId?: Types.ObjectId;
    relatedQuestionId?: Types.ObjectId;
    relatedTestId?: Types.ObjectId;
  }) {
    const session = await UserModel.startSession();
    try {
      let balanceAfter = 0;

      await session.withTransaction(async () => {
        const user = await UserModel.findById(params.studentId).session(session);
        if (!user) throw new AppError("User not found.", 404);

        if (params.type === "spend" && user.exp < params.amount) {
          throw new AppError("Insufficient EXP.", 400);
        }

        balanceAfter = params.type === "earn" ? user.exp + params.amount : user.exp - params.amount;

        await UserModel.updateOne({ _id: params.studentId }, { exp: balanceAfter }).session(session);

        const signature = sign({
          studentId: params.studentId.toString(),
          type: params.type,
          amount: params.amount,
          reason: params.reason,
          balanceAfter,
          timestamp: Date.now(),
        });

        await ExpTransactionModel.create(
          [
            {
              studentId: params.studentId,
              type: params.type,
              amount: params.amount,
              reason: params.reason,
              relatedAttemptId: params.relatedAttemptId,
              relatedQuestionId: params.relatedQuestionId,
              relatedTestId: params.relatedTestId,
              balanceAfter,
              signature,
            },
          ],
          { session },
        );
      });

      return { balanceAfter };
    } finally {
      await session.endSession();
    }
  }

  async countHintsPurchased(studentId: Types.ObjectId, testId: Types.ObjectId, questionId: Types.ObjectId): Promise<number> {
    return ExpTransactionModel.countDocuments({
      studentId,
      relatedTestId: testId,
      relatedQuestionId: questionId,
      reason: "hint_purchase",
    });
  }
}
