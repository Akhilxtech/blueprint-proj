
import { NextResponse } from "next/server";
import { getParticipantForApi } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const authResult = await getParticipantForApi();

    if ("error" in authResult) {
      return authResult.error;
    }

    const { team } = authResult;

    if (!team.isFinalist) {
      return NextResponse.json(
        { error: "Only finalist teams can access deliverables." },
        { status: 403 },
      );
    }

    const selection = await prisma.teamSelection.findUnique({
      where: { teamId: team.id },
      select: {
        statementId: true,
        statement: {
          select: { deliverables: true },
        },
      },
    });

    if (!selection) {
      return NextResponse.json(
        { error: "Select a problem statement first." },
        { status: 409 },
      );
    }

    const items = selection.statement.deliverables
      .split("\n")
      .map((text) => text.trim())
      .filter(Boolean);

    const progress = await prisma.teamDeliverableProgress.findMany({
      where: {
        teamId: team.id,
        statementId: selection.statementId,
        deliverableIndex: { lt: items.length },
      },
      select: {
        deliverableIndex: true,
        completed: true,
      },
    });

    const completedByIndex = new Map(
      progress.map((item) => [item.deliverableIndex, item.completed]),
    );

    return NextResponse.json(
      {
        statementId: selection.statementId,
        deliverables: items.map((text, index) => ({
          index,
          text,
          completed: completedByIndex.get(index) ?? false,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Round 3 deliverables GET error:", error);

    return NextResponse.json(
      { error: "Could not load deliverable progress." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const authResult = await getParticipantForApi();

    if ("error" in authResult) {
      return authResult.error;
    }

    const { team } = authResult;

    if (!team.isFinalist) {
      return NextResponse.json(
        { error: "Only finalist teams can update deliverables." },
        { status: 403 },
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("index" in body) ||
      typeof body.index !== "number" ||
      !Number.isInteger(body.index) ||
      body.index < 0 ||
      !("completed" in body) ||
      typeof body.completed !== "boolean"
    ) {
      return NextResponse.json(
        { error: "A valid index and completed value are required." },
        { status: 400 },
      );
    }

    const selection = await prisma.teamSelection.findUnique({
      where: { teamId: team.id },
      select: {
        statementId: true,
        statement: { select: { deliverables: true } },
      },
    });

    if (!selection) {
      return NextResponse.json(
        { error: "Select a problem statement first." },
        { status: 409 },
      );
    }

    const items = selection.statement.deliverables
      .split("\n")
      .map((text) => text.trim())
      .filter(Boolean);

    if (body.index >= items.length) {
      return NextResponse.json(
        { error: "Deliverable index is out of range." },
        { status: 400 },
      );
    }

    const progress = await prisma.teamDeliverableProgress.upsert({
      where: {
        teamId_statementId_deliverableIndex: {
          teamId: team.id,
          statementId: selection.statementId,
          deliverableIndex: body.index,
        },
      },
      create: {
        teamId: team.id,
        statementId: selection.statementId,
        deliverableIndex: body.index,
        completed: body.completed,
      },
      update: {
        completed: body.completed,
      },
      select: {
        deliverableIndex: true,
        completed: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      progress,
    });
  } catch (error) {
    console.error("Round 3 deliverables PATCH error:", error);

    return NextResponse.json(
      { error: "Could not update deliverable progress." },
      { status: 500 },
    );
  }
}
