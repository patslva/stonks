import DashboardClient from "@/components/dashboard-client";

export default async function Page() {
  return (
    <main className="min-h-dvh" style={{ backgroundColor: '#000000' }}>
      <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 lg:py-10">
        <DashboardClient />
      </div>
    </main>
  );
}
