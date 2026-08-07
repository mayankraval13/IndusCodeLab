import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();
const HELLO_ID = "62ed40ba-fd40-403b-b94d-5974799eca01";

async function main() {
  const units = await prisma.unit.findMany({
    include: { subject: true },
    orderBy: [{ order: "asc" }],
  });

  console.log(
    "Units:",
    units.map((u) => ({
      id: u.id,
      title: u.title,
      subject: u.subject.name,
      code: u.subject.code,
    }))
  );

  // Prefer Data Structures → Arrays & Strings, else first unit
  const target =
    units.find(
      (u) =>
        u.subject.code === "CS201" &&
        u.title.toLowerCase().includes("array")
    ) || units[0];

  if (!target) {
    throw new Error("No units found — seed subjects first");
  }

  const updated = await prisma.problem.update({
    where: { id: HELLO_ID },
    data: {
      unitId: target.id,
      type: "PRACTICAL",
      executionMode: "JUDGE0_RUN",
    },
  });

  console.log(
    JSON.stringify(
      {
        mapped: true,
        problemId: updated.id,
        title: updated.title,
        unitId: updated.unitId,
        unitTitle: target.title,
        subject: target.subject.name,
        subjectId: target.subjectId,
        type: updated.type,
        executionMode: updated.executionMode,
        browsePath: `/practicals/${target.subjectId}/units/${target.id}`,
        workspacePath: `/practical/${updated.id}`,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
