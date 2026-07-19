"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/apiClient";
import { getApiErrorMessage } from "@/lib/apiError";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Overview {
  totalUsers: number;
  totalTests: number;
  completedTests: number;
  avgTheta: number;
}

interface PerformanceData {
  thetaDistribution: { _id: number | string; count: number }[];
  testsPerDay: { _id: string; count: number }[];
  correctnessByDifficulty: { _id: string; avgCorrectness: number; count: number }[];
}

const THETA_BUCKET_LABELS: Record<string, string> = {
  "-2": "-2 to -1.5",
  "-1.5": "-1.5 to -1",
  "-1": "-1 to -0.5",
  "-0.5": "-0.5 to 0",
  "0": "0 to 0.5",
  "0.5": "0.5 to 1",
  "1": "1 to 1.5",
  "1.5": "1.5 to 2",
  "2": "2+",
};

export default function AdminDashboardPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([apiClient.get("/admin/overview"), apiClient.get("/admin/performance")])
      .then(([overviewRes, perfRes]) => {
        setOverview(overviewRes.data.data);
        setPerformance(perfRes.data.data);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <main className="px-6 py-8">
        <p className="text-sm text-gray-500">Loading…</p>
      </main>
    );
  }

  if (error || !overview || !performance) {
    return (
      <main className="px-6 py-8">
        <p className="text-sm text-red-600">{error ?? "Could not load dashboard."}</p>
      </main>
    );
  }

  const thetaChartData = performance.thetaDistribution
    .filter((b) => b._id !== "other")
    .map((b) => ({ bucket: THETA_BUCKET_LABELS[String(b._id)] ?? String(b._id), count: b.count }));

  const testsPerDayData = performance.testsPerDay.map((d) => ({ date: d._id.slice(5), count: d.count }));

  const correctnessData = performance.correctnessByDifficulty.map((d) => ({
    difficulty: d._id.replace("_", " "),
    accuracy: Math.round(d.avgCorrectness * 100),
  }));

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="mb-6 text-xl font-semibold">Admin dashboard</h1>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Students" value={overview.totalUsers} />
        <StatCard label="Tests started" value={overview.totalTests} />
        <StatCard label="Tests completed" value={overview.completedTests} />
        <StatCard label="Avg. ability (θ)" value={overview.avgTheta.toFixed(2)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Student ability distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={thetaChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#111827" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tests completed (last 14 days)">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={testsPerDayData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#111827" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Accuracy by difficulty">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={correctnessData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="difficulty" tick={{ fontSize: 10 }} />
              <YAxis unit="%" tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="accuracy" fill="#111827" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-gray-200 p-4">
      <h2 className="mb-3 text-sm font-medium text-gray-900">{title}</h2>
      {children}
    </div>
  );
}
