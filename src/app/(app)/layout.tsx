import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#07070e] text-slate-100">
      <Sidebar
        organizationId={session.user.organizationId}
        userId={session.user.id}
        userName={session.user.name}
        userImage={session.user.image}
        userRole={session.user.role}
      />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}
