
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";

const Arrow = () => (
  <span
    aria-hidden="true"
    className="text-lg transition-transform duration-200 group-hover:translate-x-1"
  >
    →
  </span>
);

export default function Home() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === "admin" ? "/admin/dashboard" : "/dashboard");
    }
  }, [loading, user, router]);

  return (
    <main className="min-h-screen overflow-hidden bg-white text-[#07111f]">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-12">
        <a href="/" className="flex items-center">
          <img
            src="/logo.png"
            alt="Adaptive Code Platform"
            className="h-10 w-auto object-contain sm:h-10"
          />
        </a>

        <div className="hidden items-center gap-8 text-sm font-semibold text-slate-600 md:flex">
          <a href="#platform" className="transition hover:text-[#1976ff]">
            Platform
          </a>
          <a href="#how-it-works" className="transition hover:text-[#1976ff]">
            How it works
          </a>
          <a href="#teams" className="transition hover:text-[#1976ff]">
            For teams
          </a>
        </div>

        <div className="flex items-center gap-3 text-sm font-semibold">
          <a href="/login" className="hidden px-3 py-2 sm:inline-block">
            Log in
          </a>
          <a
            href="/register"
            className="rounded-full bg-[#07111f] px-5 py-2.5 text-white transition hover:-translate-y-0.5 hover:bg-[#1976ff] hover:shadow-lg hover:shadow-blue-500/20">
            Start assessing
          </a>
        </div>
      </nav>

      <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-24 pt-14 sm:px-8 lg:grid-cols-[.95fr_1.05fr] lg:px-12 lg:pb-32 lg:pt-24">
        <div className="absolute -left-40 top-4 h-[30rem] w-[30rem] rounded-full bg-blue-100/70 blur-3xl" />
        <div className="absolute right-0 top-12 h-72 w-72 rounded-full bg-sky-100/60 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center">
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[.98] tracking-[-.07em] sm:text-6xl lg:text-7xl">
            Every challenge should meet you{" "}
            <span className="text-[#1976ff]">where you are.</span>
          </h1>

          <p className="mt-7 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
            Adaptive is the code testing platform that adjusts in real time.
            Stronger performance unlocks deeper challenges; every response
            sharpens the next question.
          </p>

          <div className="mt-9 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <a
              href="/register"
              className="group inline-flex items-center gap-3 rounded-full bg-[#1976ff] px-6 py-4 text-sm font-extrabold text-white transition hover:-translate-y-1 hover:bg-[#075fd7] hover:shadow-xl hover:shadow-blue-500/25">
              Create an assessment <Arrow />
            </a>

            <a
              href="#how-it-works"
              className="group px-2 text-sm font-bold underline decoration-slate-300 underline-offset-8 transition hover:text-[#1976ff]"
            >
              See adaptive testing work <Arrow />
            </a>
          </div>

          <p className="mt-11 flex items-center gap-2 text-xs font-semibold text-slate-500">
            <span className="text-[#1976ff]">✦</span>
            Precise evaluation. A better candidate experience.
          </p>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-2xl lg:pt-2">
          <div className="absolute -inset-7 rounded-full border border-blue-100" />
          <div className="absolute -inset-1 rounded-full border border-blue-50" />

          <div className="relative overflow-hidden rounded-3xl border-[7px] border-white bg-[#07111f] p-5 text-white shadow-2xl shadow-blue-950/20 transition duration-500 hover:-translate-y-2 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/10 pb-5 text-[10px] font-semibold uppercase tracking-[.14em] text-slate-400">
              <span>Live assessment</span>
              <span className="rounded-full bg-blue-500/15 px-2.5 py-1 text-[#72adff]">
                Difficulty adapting
              </span>
            </div>

            <div className="mt-7 grid gap-5 sm:grid-cols-[1fr_148px]">
              <div>
                <p className="text-xs text-[#72adff]">
                  Question 08{" "}
                  <span className="ml-2 text-slate-500">
                    • Algorithmic thinking
                  </span>
                </p>

                <h2 className="mt-3 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
                  Find the first non-repeating character in a string.
                </h2>

                <div className="mt-5 rounded-xl border border-white/10 bg-white/[.06] p-4 font-mono text-xs leading-6">
                  <span className="text-[#72adff]">function</span>{" "}
                  firstUnique(str) {"{"}
                  <br />
                  <span className="ml-4 text-slate-400">// your answer</span>
                  <br />
                  {"}"}
                </div>
              </div>

              <aside className="rounded-2xl bg-[#0e2039] p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Your level
                </p>

                <p className="mt-1 text-2xl font-extrabold text-[#72adff]">
                  Advanced
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    ["Core", "w-[95%]"],
                    ["Applied", "w-[72%]"],
                    ["Advanced", "w-[50%]"],
                  ].map(([label, width]) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-[10px] text-slate-400">
                        <span>{label}</span>
                        <span>{label === "Advanced" ? "Now" : "Complete"}</span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full ${width} rounded-full bg-[#1976ff]`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </aside>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <div className="flex gap-2">
                {["35%", "50%", "65%", "80%", "100%"].map((value, index) => (
                  <span
                    key={value}
                    className={`h-1.5 w-8 rounded-full ${
                      index < 3 ? "bg-[#1976ff]" : "bg-white/15"
                    }`}
                  />
                ))}
              </div>

              <span className="text-[11px] font-medium text-slate-400">
                Calibrating in real time
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        id="platform"
        className="border-y border-slate-100 bg-[#f7faff] px-5 py-20 sm:px-8 lg:px-12"
      >
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1976ff]">
                Designed to reveal real skill
              </p>

              <h2 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-[-.055em] sm:text-5xl">
                A fairer signal than one-size-fits-all testing.
              </h2>
            </div>

            <p className="max-w-md text-base leading-7 text-slate-600">
              Static assessments lose valuable context. Adaptive testing gets
              more precise with every answer, so teams can see the depth—not
              just the score.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {[
              [
                "01",
                "Respond",
                "Candidates solve a carefully designed opening challenge that establishes their baseline.",
              ],
              [
                "02",
                "Adapt",
                "The platform raises, lowers, or shifts the next question's focus based on their live performance.",
              ],
              [
                "03",
                "Reveal",
                "A rich skills profile shows confidence, progression, and the reasoning behind the final result.",
              ],
            ].map(([number, title, body]) => (
              <article
                key={number}
                className="group min-h-64 rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-2 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-900/5"
              >
                <span className="font-mono text-sm font-bold text-[#1976ff]">
                  {number}
                </span>

                <h3 className="mt-10 text-xl font-extrabold tracking-tight">
                  {title}
                </h3>

                <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="how-it-works"
        className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-12"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-[.16em] text-[#1976ff]">
            Assess with confidence
          </p>

          <h2 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-[-.055em] sm:text-5xl">
            High-resolution insight, without a longer test.
          </h2>

          <p className="mt-6 max-w-md text-base leading-7 text-slate-600">
            Each challenge is selected to efficiently uncover what someone
            knows, how they think, and where they excel.
          </p>
        </div>

        <div className="rounded-3xl bg-[#07111f] p-6 sm:p-9">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#72adff]">
              Performance signal
            </p>
            <span className="text-xs text-slate-400">Updated now</span>
          </div>

          <div className="mt-8 grid grid-cols-10 items-end gap-3 border-b border-white/10 pb-3 sm:gap-5">
            {[40, 52, 44, 69, 60, 78, 76, 94, 89, 100].map(
              (height, index) => (
                <div
                  key={index}
                  className="rounded-t-md bg-gradient-to-t from-[#1976ff] to-[#74b0ff]"
                  style={{ height: `${height}px` }}
                />
              )
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4 text-xs text-slate-300">
            <span>
              <b className="block text-lg text-white">94%</b>
              Skill confidence
            </span>
            <span>
              <b className="block text-lg text-white">26m</b>
              Average completion
            </span>
            <span>
              <b className="block text-lg text-white">3.2×</b>
              More signal per task
            </span>
          </div>
        </div>
      </section>

      <section id="teams" className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-12">
        <div className="rounded-3xl bg-[#1976ff] px-7 py-12 text-white sm:px-12 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[.16em] text-blue-100">
            Build the team you imagine
          </p>

          <div className="mt-4 flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <h2 className="max-w-2xl text-4xl font-extrabold leading-[1.03] tracking-[-.06em] sm:text-5xl">
              Better testing begins with better questions.
            </h2>

            <a
              href="/register"
              className="group inline-flex w-fit items-center gap-3 rounded-full bg-white px-6 py-4 text-sm font-bold text-[#07111f] transition hover:-translate-y-1 hover:shadow-xl"
            >
              Start assessing free <Arrow />
            </a>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-slate-100 px-5 py-9 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
        <a href="/" className="flex items-center">
          <img
            src="/logo.png"
            alt="Adaptive Code Platform"
            className="h-7 w-auto object-contain"
          />
        </a>

        <span>Adaptive assessments for modern engineering teams.</span>
        <span>© 2026 Maanak-CodingPlatform</span>
      </footer>
    </main>
  );
}