
import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireAdmin() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!adminEmails.has(session.user.email.trim().toLowerCase())) {
    redirect("/not-registered");
  }

  return session;
}

export async function requireParticipant() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/");
  }

  const email = session.user.email.trim().toLowerCase();

  const participant = await prisma.participant.findFirst({
    where: {
      email: {
        equals: email,
        mode: "insensitive",
      },
    },
    include: {
      team: true,
    },
  });

  if (!participant) {
    redirect("/not-registered");
  }

  if (participant.userId && participant.userId !== session.user.id) {
    redirect("/not-registered");
  }

  if (!participant.userId) {
    const result = await prisma.participant.updateMany({
      where: {
        id: participant.id,
        userId: null,
      },
      data: {
        userId: session.user.id,
      },
    });

    if (result.count !== 1) {
      redirect("/not-registered");
    }
  }

  return {
    session,
    participant,
    team: participant.team,
  };
}