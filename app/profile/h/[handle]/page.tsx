import { notFound, redirect } from "next/navigation";
import { getUserByHandle } from "@/lib/db/users";

export default async function ProfileByHandlePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle: raw } = await params;
  const handle = decodeURIComponent(raw).trim().toLowerCase();
  if (!handle) notFound();

  const user = await getUserByHandle(handle);
  if (!user) notFound();

  redirect(`/profile/${user.id}`);
}
