import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient, UserRole } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = "admin@leetlab.com";
const ADMIN_PASSWORD = "admin123";

function normalizeProblem(raw, userId) {
  const examples = { ...raw.examples };
  if (!examples.JAVA) {
    examples.JAVA = {
      input: "1 2",
      output: "3",
      explanation: "Adding 1 and 2 gives 3.",
    };
  }

  return {
    title: raw.title,
    description: raw.description,
    difficulty: raw.difficulty,
    tags: raw.tags,
    examples,
    constraints: raw.constraints,
    hints: raw.hints ?? null,
    editorial: raw.editorial ?? null,
    testCases: raw.testCases ?? raw.testcases,
    codeSnippets: raw.codeSnippets,
    referenceSolution: raw.referenceSolution ?? raw.referenceSolutions,
    userId,
  };
}

async function main() {
  const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { role: UserRole.ADMIN, password: hashedPassword, name: "Admin" },
    create: {
      email: ADMIN_EMAIL,
      password: hashedPassword,
      name: "Admin",
      role: UserRole.ADMIN,
    },
  });

  console.log(`Admin user ready: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log(`Admin id: ${admin.id}`);

  const samplePath = path.join(__dirname, "..", "sample.json");
  const raw = JSON.parse(fs.readFileSync(samplePath, "utf-8"));
  const problemData = normalizeProblem(raw, admin.id);

  const existing = await prisma.problem.findFirst({
    where: { title: problemData.title },
  });

  if (existing) {
    console.log(`Problem "${problemData.title}" already exists (id: ${existing.id})`);
  } else {
    const problem = await prisma.problem.create({ data: problemData });
    console.log(`Seeded problem: ${problem.title} (id: ${problem.id})`);
  }

  const count = await prisma.problem.count();
  console.log(`Total problems in database: ${count}`);

  const subjectsWithUnits = [
    {
      name: "Data Structures",
      code: "CS201",
      units: [
        { title: "Arrays & Strings", order: 1 },
        { title: "Trees", order: 2 },
        { title: "Graphs", order: 3 },
      ],
    },
    {
      name: "DBMS",
      code: "CS301",
      units: [
        { title: "Relational Model", order: 1 },
        { title: "SQL & Queries", order: 2 },
        { title: "Transactions & Indexing", order: 3 },
      ],
    },
    {
      name: "Operating Systems",
      code: "CS302",
      units: [
        { title: "Processes & Threads", order: 1 },
        { title: "Memory Management", order: 2 },
        { title: "File Systems", order: 3 },
      ],
    },
  ];

  for (const { name, code, units } of subjectsWithUnits) {
    const subject = await prisma.subject.upsert({
      where: { code },
      update: { name },
      create: { name, code },
    });

    console.log(`Subject ready: ${subject.name} (${subject.code})`);

    for (const unit of units) {
      const existingUnit = await prisma.unit.findFirst({
        where: { subjectId: subject.id, title: unit.title },
      });

      if (existingUnit) {
        console.log(`  Unit already exists: ${unit.title}`);
      } else {
        const created = await prisma.unit.create({
          data: {
            title: unit.title,
            order: unit.order,
            subjectId: subject.id,
          },
        });
        console.log(`  Seeded unit: ${created.title}`);
      }
    }
  }

  const subjectCount = await prisma.subject.count();
  const unitCount = await prisma.unit.count();
  console.log(`Total subjects: ${subjectCount}, total units: ${unitCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
