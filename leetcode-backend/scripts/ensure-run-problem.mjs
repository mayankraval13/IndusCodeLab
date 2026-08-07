import { PrismaClient } from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();

async function main() {
  const problems = await prisma.problem.findMany({
    select: {
      id: true,
      title: true,
      executionMode: true,
      type: true,
      userId: true,
    },
  });
  console.log(JSON.stringify(problems, null, 2));

  let runProblem = problems.find((p) => p.executionMode === "JUDGE0_RUN");
  if (!runProblem) {
    const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    if (!admin) {
      console.error("No admin user to attach problem to");
      return;
    }
    runProblem = await prisma.problem.create({
      data: {
        title: "Practical: Hello Compiler",
        description:
          "Write a program that prints Hello. Use Run to see stdout/stderr.",
        difficulty: "EASY",
        tags: ["practical", "run"],
        examples: {
          PYTHON: { input: "", output: "Hello", explanation: "Print Hello" },
        },
        constraints: "None",
        hints: null,
        editorial: null,
        testCases: [],
        codeSnippets: {
          PYTHON: 'print("Hello")\n',
          JAVA: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello");\n  }\n}\n',
          C: '#include <stdio.h>\nint main() {\n  printf("Hello\\n");\n  return 0;\n}\n',
          CPP: '#include <iostream>\nint main() {\n  std::cout << "Hello" << std::endl;\n  return 0;\n}\n',
        },
        referenceSolution: {},
        userId: admin.id,
        type: "PRACTICAL",
        executionMode: "JUDGE0_RUN",
      },
    });
    console.log("Created JUDGE0_RUN problem:", runProblem.id);
  } else {
    console.log("Existing JUDGE0_RUN problem:", runProblem.id, runProblem.title);
  }

  const gradeProblem = problems.find((p) => p.executionMode === "JUDGE0_GRADE") || problems[0];
  console.log(
    "GRADE problem:",
    gradeProblem?.id,
    gradeProblem?.title,
    gradeProblem?.executionMode
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
