import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSubjects } from "@/app/actions";
import SubjectDashboard from "@/components/SubjectDashboard";
import Header from "@/components/Header";

// Force dynamic rendering since we are reading from DB
export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const subjects = await getSubjects();

  return (
    <>
      <Header />
      <main className="flex-1 w-full bg-[#080c14] relative">
        <SubjectDashboard initialSubjects={subjects} />
      </main>
    </>
  );
}


