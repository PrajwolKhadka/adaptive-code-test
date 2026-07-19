import { Types } from "mongoose";
import { AdminRepository } from "../repositories/admin.repository";
import { AppError } from "../middlewares/errorHandler.middleware";
import { logActivity } from "../utils/activityLogger";
import { Role } from "../models/index.models";

interface Ctx {
  ip: string;
  userAgent: string;
}

export class AdminService {
  private repo = new AdminRepository();

  async getOverview() {
    const [totalUsers, totalTests, completedTests, avgTheta] = await Promise.all([
      this.repo.countUsers(),
      this.repo.countTests(),
      this.repo.countCompletedTests(),
      this.repo.averageTheta(),
    ]);
    return { totalUsers, totalTests, completedTests, avgTheta };
  }

  async getPerformanceCharts() {
    const [thetaDistribution, testsPerDay, correctnessByDifficulty] = await Promise.all([
      this.repo.thetaDistribution(),
      this.repo.testsCompletedPerDay(),
      this.repo.correctnessByDifficulty(),
    ]);
    return { thetaDistribution, testsPerDay, correctnessByDifficulty };
  }

  listStudents() {
    return this.repo.listStudents();
  }

  async deleteUser(targetUserId: string, requestingAdminId: Types.ObjectId, ctx: Ctx) {
    if (targetUserId === requestingAdminId.toString()) {
      throw new AppError("You cannot delete your own account from the admin panel.", 400);
    }

    const target = await this.repo.findUserRole(targetUserId);
    if (!target) throw new AppError("User not found.", 404);
    if (target.role === Role.ADMIN) {
      throw new AppError("Admin accounts cannot be deleted from this panel.", 403);
    }

    await this.repo.deleteUser(targetUserId);
    await logActivity({
      userId: requestingAdminId,
      action: "admin_deleted_user",
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      metadata: { deletedUserId: targetUserId },
      severity: "warn",
    });
  }
}
