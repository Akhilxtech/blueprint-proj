import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

const finalistSchema = z.object({
  isFinalist: z.boolean(),
});

type RouteContext = {
  params: Promise<{ teamId: string }>;
};

export async function PATCH(
  request: Request,
  context: RouteContext,
) {
  await requireAdmin();

  try {
    const { teamId } = await context.params;

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body." },
        { status: 400 },
      );
    }

    const parsed = finalistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "isFinalist must be true or false." },
        { status: 400 },
      );
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { id: true, name: true },
    });

    if (!team) {
      return NextResponse.json(
        { error: "Team not found." },
        { status: 404 },
      );
    }

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: { isFinalist: parsed.data.isFinalist },
      select: {
        id: true,
        name: true,
        isFinalist: true,
      },
    });

    return NextResponse.json({
      success: true,
      teamId: updated.id,
      teamName: updated.name,
      isFinalist: updated.isFinalist,
    });
  } catch (error) {
    console.error("Manual finalist update error:", error);

    return NextResponse.json(
      { error: "Could not update finalist status." },
      { status: 500 },
    );
  }
}