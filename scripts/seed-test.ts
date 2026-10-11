
import "dotenv/config";
import { prisma } from "../lib/db";

function getTestEmails(): string[] {
  const emails = (process.env.TEST_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (emails.length !== 4) {
    throw new Error(
      "Set TEST_EMAILS to exactly 4 comma-separated test email addresses.",
    );
  }

  if (new Set(emails).size !== emails.length) {
    throw new Error("TEST_EMAILS must contain 4 unique email addresses.");
  }

  return emails;
}

async function main() {
  const emails = getTestEmails();

  const teamNames = ["Test Team Alpha", "Test Team Beta"];

  for (let i = 0; i < teamNames.length; i++) {
    const teamName = teamNames[i];
    const team = await prisma.team.upsert({
      where: { name: teamName },
      update: {},
      create: { name: teamName },
    });

    for (let j = 0; j < 2; j++) {
      const email = emails[i * 2 + j];
      const existing = await prisma.participant.findUnique({
        where: { email },
      });

      if (existing) {
        console.log(`Skipping existing participant: ${email}`);
        continue;
      }

      await prisma.participant.create({
        data: {
          name: `Test Participant ${i * 2 + j + 1}`,
          email,
          teamId: team.id,
        },
      });

      console.log(`Created participant: ${email} (${teamName})`);
    }
  }

  console.log("Test data seeding complete.");
}

main()
  .catch((error) => {
    console.error("Test data seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
