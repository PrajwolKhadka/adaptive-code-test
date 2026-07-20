"use client";
import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { useCurrentUser } from "@/lib/useCurrentUser";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface RecentTest {
  testId: string;
  completedAt: string;
  scorePercent: number;
  finalTheta: number;
}

interface StudentStats {
  totalTestsCompleted: number;
  totalAttempts: number;
  accuracyPercent: number;
  averageScorePercent: number;
  recentTests: RecentTest[];
}

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const { user } = useCurrentUser();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get("/tests/stats")
      .then((res) => setStats(res.data.data))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const firstName = user?.email.split("@")[0] ?? "";
  const chartData = stats
    ? [...stats.recentTests]
        .reverse()
        .map((t) => ({
          date: new Date(t.completedAt).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          }),
          score: t.scorePercent,
          theta: Number(t.finalTheta.toFixed(2)),
        }))
    : [];

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Here's how you're doing so far.
          </p>
        </div>
        <a
          href="/test"
          className="rounded-md bg-blue-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-600"
        >
          Start a test
        </a>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading your stats…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && stats && (
        <>
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard
              label="Tests completed"
              value={stats.totalTestsCompleted}
            />
            <StatCard label="EXP" value={user?.exp ?? 0} />
            <StatCard
              label="Accuracy"
              value={`${stats.accuracyPercent}%`}
              hint="Across every question answered"
            />
            <StatCard
              label="Average score"
              value={`${stats.averageScorePercent}%`}
              hint="Averaged per completed test"
            />
          </div>

          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-md border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Total questions attempted</p>
              <p className="mt-1 text-xl font-semibold">
                {stats.totalAttempts}
              </p>
            </div>
            <div className="rounded-md border border-gray-200 p-4">
              <p className="text-xs text-gray-500">
                Current ability estimate (θ)
              </p>
              <p className="mt-1 text-xl font-semibold">
                {user?.theta.toFixed(2) ?? "0.00"}
              </p>
            </div>
          </div>

          {/* Performance over time chart */}
          <div className="mb-8 rounded-md border border-gray-200 p-4">
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Performance over time
            </h2>
            {chartData.length < 2 ? (
              <p className="text-sm text-gray-500">
                Complete a few more tests to see your trend here.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <YAxis
                      yAxisId="score"
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <YAxis
                      yAxisId="theta"
                      orientation="right"
                      tick={{ fontSize: 12, fill: "#6b7280" }}
                    />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 6,
                        borderColor: "#e5e7eb",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      yAxisId="score"
                      type="monotone"
                      dataKey="score"
                      name="Score %"
                      stroke="#111827"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                    <Line
                      yAxisId="theta"
                      type="monotone"
                      dataKey="theta"
                      name="Theta (θ)"
                      stroke="#9ca3af"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">
              Recent tests
            </h2>
            {stats.recentTests.length === 0 ? (
              <p className="text-sm text-gray-500">
                You haven't completed a test yet — take your first one to see
                your progress here.
              </p>
            ) : (
              <div className="divide-y divide-gray-200 rounded-md border border-gray-200">
                {stats.recentTests.map((t) => (
                  <a
                    key={t.testId}
                    href={`/test/${t.testId}/results`}
                    className="flex items-center justify-between px-4 py-3 text-sm hover:bg-gray-50"
                  >
                    <span className="text-gray-700">
                      {new Date(t.completedAt).toLocaleDateString()}
                    </span>
                    <span className="text-gray-500">
                      θ {t.finalTheta.toFixed(2)}
                    </span>
                    <span className="font-medium text-gray-900">
                      {t.scorePercent}%
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
      {hint && <p className="mt-0.5 text-[10px] text-gray-400">{hint}</p>}
    </div>
  );
}