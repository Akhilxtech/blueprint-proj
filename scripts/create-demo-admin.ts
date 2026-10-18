import dotenv from "dotenv";

const loaded = dotenv.config({
  path: ".env.demo",
  override: true,
});

if (loaded.error) {
  throw new Error("Could not load .env.demo");
}

if (process.env.DEMO_MODE !== "true") {
  throw new Error("Refusing to continue: DEMO_MODE must be true.");
}

const email = (process.env.DEMO_ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.DEMO_ADMIN_PASSWORD;
const admins = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);

if (!email || !password || !process.env.BETTER_AUTH_SECRET) {
  throw new Error("Demo email, password, or auth secret is missing.");
}

if (!admins.includes(email)) {
  throw new Error("Demo admin email is not in ADMIN_EMAILS.");
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Demo DATABASE_URL is missing.");
}

const databaseHost = new URL(connectionString).hostname;

if (databaseHost !== "aws-0-ap-south-1.pooler.supabase.com") {
  throw new Error(
    `Unexpected database host (${databaseHost}); refusing to create account.`,
  );
}

const { PrismaPg } = await import("@prisma/adapter-pg");
const { PrismaClient } = await import("../lib/generated/prisma/client");
const { hashPassword } = await import("better-auth/crypto");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

try {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: { accounts: true },
  });

  if (existingUser) {
    throw new Error(
      "A user with the demo email already exists. No records were changed.",
    );
  }

  const userId = crypto.randomUUID();
  const now = new Date();
  const passwordHash = await hashPassword(password);

  await prisma.$transaction(async (tx) => {
    await tx.user.create({
      data: {
        id: userId,
        name: "Recruiter Demo",
        email,
        emailVerified: true,
        createdAt: now,
        updatedAt: now,
      },
    });

    await tx.account.create({
      data: {
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });
  });

  console.log("Demo admin account created successfully.");
  console.log("Email:", email);
  console.log("Password: stored securely as a hash.");
  console.log("Database host:", databaseHost);
} finally {
  await prisma.$disconnect();
  password && (process.env.DEMO_ADMIN_PASSWORD = "");
}
