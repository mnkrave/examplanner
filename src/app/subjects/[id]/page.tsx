import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSubjectDetail } from "@/app/actions";
import SubjectDetail from "@/components/SubjectDetail";
import Header from "@/components/Header";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface SubjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function SubjectPage({ params }: SubjectPageProps) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const { id } = await params;
  const subject = await getSubjectDetail(id);

  if (!subject) {
    notFound();
  }

  return (
    <>
      <Header />
      <main className="flex-1 w-full bg-[#080c14] relative">
        <SubjectDetail subject={subject} />
      </main>
    </>
  );
}

