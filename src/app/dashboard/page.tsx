import DashboardClient from "@/components/dashboard-client";

export default async function Page() {
  return (
    <main style={{ backgroundColor: '#000000', minHeight: '100vh', padding: '0', margin: '0' }}>
      <div style={{ backgroundColor: '#000000', maxWidth: '1280px', margin: '0 auto', padding: '32px 16px' }}>
        <DashboardClient />
      </div>
    </main>
  );
}
