export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Adaptive Code Platform</h1>
      <div className="flex gap-3">
        <a href="/login" className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800">
          Log in
        </a>
        <a href="/register" className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50">
          Register
        </a>
      </div>
    </main>
  );
}
