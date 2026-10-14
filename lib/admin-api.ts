import "server-only";

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-helper";

export async function verifyAdminApi() {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const admins = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

  if (!admins.has(session.user.email.trim().toLowerCase())) {
    return NextResponse.json(
      { error: "Administrator access required." },
      { status: 403 },
    );
  }

  return null;
}