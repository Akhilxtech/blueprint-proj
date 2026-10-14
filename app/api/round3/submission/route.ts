
import { NextResponse } from "next/server";
import { getParticipantForApi } from "@/lib/auth-helper";
import { prisma } from "@/lib/db";
import { getRound3Window } from "@/lib/round3-windows";

export async function GET() {
  try {
    const authResult = await getParticipantForApi();

    if ("error" in authResult) {
      return authResult.error;
    }

    const { team } = authResult;

    if (!team.isFinalist) {
      return NextResponse.json(
        { error: "Only finalist teams can access submissions." },
        { status: 403 },
      );
    }

    const [window, submission] = await Promise.all([
      getRound3Window("submission"),
      prisma.deploymentSubmission.findUnique({
        where: { teamId: team.id },
        select: {
          url: true,
          submittedAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        serverNow: new Date().toISOString(),
        window,
        submission,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Round 3 submission GET error:", error);

    return NextResponse.json(
      { error: "Could not load deployment submission." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const authResult = await getParticipantForApi();

    if ("error" in authResult) {
      return authResult.error;
    }

    const { team } = authResult;

    if (!team.isFinalist) {
      return NextResponse.json(
        { error: "Only finalist teams can submit a deployment URL." },
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
      !("url" in body) ||
      typeof body.url !== "string"
    ) {
      return NextResponse.json(
        { error: "A deployment URL is required." },
        { status: 400 },
      );
    }

    const url = body.url.trim();

    if (url.length > 2048) {
      return NextResponse.json(
        { error: "The URL must not exceed 2048 characters." },
        { status: 400 },
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Enter a valid deployment URL." },
        { status: 400 },
      );
    }

    if (
      !["http:", "https:"].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname.includes(".") ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return NextResponse.json(
        { error: "Enter a valid HTTP or HTTPS deployment URL." },
        { status: 400 },
      );
    }

    const window = await getRound3Window("submission");

    if (
      !window.isOpen ||
      !window.deadline ||
      Date.parse(window.deadline) <= Date.now()
    ) {
      return NextResponse.json(
        { error: "The deployment submission window is closed." },
        { status: 409 },
      );
    }

    const existing = await prisma.teamSelection.findUnique({
      where: { teamId: team.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Your team must select a problem statement first." },
        { status: 409 },
      );
    }

    const submission = await prisma.deploymentSubmission.upsert({
      where: { teamId: team.id },
      create: {
        teamId: team.id,
        url: parsedUrl.toString(),
      },
      update: {
        url: parsedUrl.toString(),
      },
      select: {
        url: true,
        submittedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { success: true, submission },
      { status: 200 },
    );
  } catch (error) {
    console.error("Round 3 submission PUT error:", error);

    return NextResponse.json(
      { error: "Could not save deployment URL." },
      { status: 500 },
    );
  }
}
