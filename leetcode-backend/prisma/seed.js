import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  PrismaClient,
  UserRole,
  Difficulty,
  ProblemType,
  ExecutionMode,
} from "../src/generated/prisma/index.js";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = "admin@leetlab.com";
const ADMIN_PASSWORD = "admin123";

const FACULTY = {
  name: "Anil Sharma",
  email: "anil.sharma@iite.indusuni.ac.in",
  password: "Faculty@123",
};

const ENROLLMENT_PREFIX = "IU234123";

/**
 * Sections are created empty — enrolment is done through
 * POST /admin/batches/:id/enroll-range so the dry run gets exercised.
 */
const BATCHES = [
  { name: "A", enrollmentPrefix: ENROLLMENT_PREFIX, serialStart: 1, serialEnd: 132 },
  { name: "B", enrollmentPrefix: ENROLLMENT_PREFIX, serialStart: 133, serialEnd: 257 },
];

/**
 * Section A of the IU234123 cohort (year 23, course 4, branch 123).
 * Each student's enrollment number doubles as their temporary password;
 * mustChangePassword forces it to be replaced at first login.
 */
const STUDENTS = [
  { enrollmentNo: "IU2341230001", name: "Ram Patel", email: "ram.23.cse@iite.indusuni.ac.in" },
  { enrollmentNo: "IU2341230002", name: "Priya Shah", email: "priya.23.cse@iite.indusuni.ac.in" },
  { enrollmentNo: "IU2341230003", name: "Arjun Mehta", email: "arjun.23.cse@iite.indusuni.ac.in" },
  { enrollmentNo: "IU2341230004", name: "Sneha Desai", email: "sneha.23.cse@iite.indusuni.ac.in" },
  { enrollmentNo: "IU2341230005", name: "Rohan Joshi", email: "rohan.23.cse@iite.indusuni.ac.in" },
  { enrollmentNo: "IU2341230006", name: "Ananya Iyer", email: "ananya.23.cse@iite.indusuni.ac.in" },
  { enrollmentNo: "IU2341230007", name: "Karan Verma", email: "karan.23.cse@iite.indusuni.ac.in" },
  { enrollmentNo: "IU2341230008", name: "Meera Nair", email: "meera.23.cse@iite.indusuni.ac.in" },
  { enrollmentNo: "IU2341230009", name: "Vivek Rao", email: "vivek.23.cse@iite.indusuni.ac.in" },
  { enrollmentNo: "IU2341230010", name: "Isha Kulkarni", email: "isha.23.cse@iite.indusuni.ac.in" },
];

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

/** Starter templates for JUDGE0_RUN practicals (C / C++ / Java / Python). */
function runModeSnippets({ cBody, cppBody, javaBody, pythonBody }) {
  return {
    C: `#include <stdio.h>\n\nint main() {\n${cBody}\n    return 0;\n}\n`,
    CPP: `#include <iostream>\n#include <vector>\n#include <string>\nusing namespace std;\n\nint main() {\n${cppBody}\n    return 0;\n}\n`,
    JAVA: `import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n${javaBody}\n        sc.close();\n    }\n}\n`,
    PYTHON: `${pythonBody}\n`,
  };
}

function makePractical({
  title,
  description,
  difficulty,
  tags,
  exampleInput,
  exampleOutput,
  explanation,
  snippets,
}) {
  return {
    title,
    description,
    difficulty,
    tags,
    examples: {
      PYTHON: {
        input: exampleInput,
        output: exampleOutput,
        explanation,
      },
      JAVA: {
        input: exampleInput,
        output: exampleOutput,
        explanation,
      },
      C: {
        input: exampleInput,
        output: exampleOutput,
        explanation,
      },
    },
    constraints: "1 ≤ n ≤ 10^5 (unless stated otherwise in the description)",
    hints: null,
    editorial: null,
    testCases: [],
    codeSnippets: snippets,
    referenceSolution: {},
    type: ProblemType.PRACTICAL,
    executionMode: ExecutionMode.JUDGE0_RUN,
  };
}

/** Sample practicals keyed by "SubjectCode::UnitTitle" */
const PRACTICALS_BY_UNIT = {
  "CS201::Arrays & Strings": [
    {
      title: "Practical: Hello Compiler",
      description:
        "Write a program that prints Hello. Use Run to see stdout/stderr.",
      difficulty: Difficulty.EASY,
      tags: ["practical", "run"],
      examples: {
        PYTHON: { input: "", output: "Hello", explanation: "Print Hello" },
        JAVA: { input: "", output: "Hello", explanation: "Print Hello" },
        C: { input: "", output: "Hello", explanation: "Print Hello" },
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
      type: ProblemType.PRACTICAL,
      executionMode: ExecutionMode.JUDGE0_RUN,
    },
    makePractical({
      title: "Reverse an Array",
      description:
        "Read an integer n, then n integers. Print the array in reverse order (space-separated).",
      difficulty: Difficulty.EASY,
      tags: ["arrays", "practical"],
      exampleInput: "4\n1 2 3 4",
      exampleOutput: "4 3 2 1",
      explanation: "Reversing [1, 2, 3, 4] gives [4, 3, 2, 1].",
      snippets: runModeSnippets({
        cBody:
          "    int n;\n    scanf(\"%d\", &n);\n    int a[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n    // Write your code here\n",
        cppBody:
          "    int n;\n    cin >> n;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    // Write your code here\n",
        javaBody:
          "        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        // Write your code here\n",
        pythonBody:
          "n = int(input())\na = list(map(int, input().split()))\n# Write your code here\n",
      }),
    }),
    makePractical({
      title: "Count Vowels in a String",
      description:
        "Read a single line of text. Print the number of vowels (a, e, i, o, u — case insensitive).",
      difficulty: Difficulty.EASY,
      tags: ["strings", "practical"],
      exampleInput: "LeetLab",
      exampleOutput: "3",
      explanation: "Vowels in 'LeetLab' are e, e, a → 3.",
      snippets: runModeSnippets({
        cBody:
          '    char s[1001];\n    fgets(s, sizeof(s), stdin);\n    // Write your code here\n',
        cppBody:
          "    string s;\n    getline(cin, s);\n    // Write your code here\n",
        javaBody:
          "        String s = sc.nextLine();\n        // Write your code here\n",
        pythonBody: "s = input()\n# Write your code here\n",
      }),
    }),
  ],
  "CS201::Trees": [
    makePractical({
      title: "Height of a Binary Tree (Level Order Input)",
      description:
        "You are given n (number of nodes) and an array of n integers representing a complete binary tree in level order (-1 means null). Compute and print the height of the tree. Height of a single-node tree is 1.",
      difficulty: Difficulty.MEDIUM,
      tags: ["trees", "practical"],
      exampleInput: "7\n1 2 3 4 5 -1 -1",
      exampleOutput: "3",
      explanation: "Root 1 has children 2 and 3; 2 has children 4 and 5 → height 3.",
      snippets: runModeSnippets({
        cBody:
          "    int n;\n    scanf(\"%d\", &n);\n    int a[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &a[i]);\n    // Write your code here\n",
        cppBody:
          "    int n;\n    cin >> n;\n    vector<int> a(n);\n    for (int i = 0; i < n; i++) cin >> a[i];\n    // Write your code here\n",
        javaBody:
          "        int n = sc.nextInt();\n        int[] a = new int[n];\n        for (int i = 0; i < n; i++) a[i] = sc.nextInt();\n        // Write your code here\n",
        pythonBody:
          "n = int(input())\na = list(map(int, input().split()))\n# Write your code here\n",
      }),
    }),
  ],
  "CS201::Graphs": [
    makePractical({
      title: "Count Connected Components",
      description:
        "Given n nodes (1..n) and m undirected edges, print the number of connected components.",
      difficulty: Difficulty.MEDIUM,
      tags: ["graphs", "practical"],
      exampleInput: "5 3\n1 2\n2 3\n4 5",
      exampleOutput: "2",
      explanation: "Components: {1,2,3} and {4,5}.",
      snippets: runModeSnippets({
        cBody:
          "    int n, m;\n    scanf(\"%d %d\", &n, &m);\n    // Read m edges and write your code here\n",
        cppBody:
          "    int n, m;\n    cin >> n >> m;\n    // Read m edges and write your code here\n",
        javaBody:
          "        int n = sc.nextInt();\n        int m = sc.nextInt();\n        // Read m edges and write your code here\n",
        pythonBody:
          "n, m = map(int, input().split())\n# Read m edges and write your code here\n",
      }),
    }),
  ],
  "CS301::Relational Model": [
    makePractical({
      title: "Check Candidate Key Uniqueness",
      description:
        "Read n rows, each with two space-separated integers (id, value). Print YES if all ids are unique (candidate key), otherwise NO.",
      difficulty: Difficulty.EASY,
      tags: ["dbms", "relational-model", "practical"],
      exampleInput: "3\n1 10\n2 20\n3 10",
      exampleOutput: "YES",
      explanation: "All ids (1,2,3) are unique.",
      snippets: runModeSnippets({
        cBody:
          "    int n;\n    scanf(\"%d\", &n);\n    // Write your code here\n",
        cppBody:
          "    int n;\n    cin >> n;\n    // Write your code here\n",
        javaBody:
          "        int n = sc.nextInt();\n        // Write your code here\n",
        pythonBody: "n = int(input())\n# Write your code here\n",
      }),
    }),
  ],
  "CS301::SQL & Queries": [
    makePractical({
      title: "Simulate SELECT with WHERE",
      description:
        "Read n student records as (roll marks). Then read threshold t. Print roll numbers of students with marks >= t, space-separated in input order. If none, print -1.",
      difficulty: Difficulty.EASY,
      tags: ["dbms", "queries", "practical"],
      exampleInput: "4\n101 45\n102 78\n103 60\n104 90\n60",
      exampleOutput: "102 103 104",
      explanation: "Students with marks >= 60 are 102, 103, 104.",
      snippets: runModeSnippets({
        cBody:
          "    int n;\n    scanf(\"%d\", &n);\n    // Write your code here\n",
        cppBody:
          "    int n;\n    cin >> n;\n    // Write your code here\n",
        javaBody:
          "        int n = sc.nextInt();\n        // Write your code here\n",
        pythonBody: "n = int(input())\n# Write your code here\n",
      }),
    }),
  ],
  "CS301::Transactions & Indexing": [
    makePractical({
      title: "Detect Dirty Read Scenario",
      description:
        "You are given a sequence of transaction operations as strings (W1 x, R2 x, C1, A1, etc.). Print DIRTY if a transaction reads a value written by another uncommitted transaction, otherwise CLEAN. For this practical, treat any R by T2 after W by T1 before C1/A1 as DIRTY.",
      difficulty: Difficulty.MEDIUM,
      tags: ["dbms", "transactions", "practical"],
      exampleInput: "4\nW1 x\nR2 x\nC1\nC2",
      exampleOutput: "DIRTY",
      explanation: "T2 reads x written by T1 before T1 commits.",
      snippets: runModeSnippets({
        cBody:
          "    int n;\n    scanf(\"%d\", &n);\n    // Write your code here\n",
        cppBody:
          "    int n;\n    cin >> n;\n    // Write your code here\n",
        javaBody:
          "        int n = sc.nextInt();\n        sc.nextLine();\n        // Write your code here\n",
        pythonBody: "n = int(input())\n# Write your code here\n",
      }),
    }),
  ],
  "CS302::Processes & Threads": [
    makePractical({
      title: "FCFS CPU Scheduling",
      description:
        "Read n processes with burst times. Assume arrival time 0 for all. Print average waiting time (float with 2 decimals) using FCFS.",
      difficulty: Difficulty.EASY,
      tags: ["os", "scheduling", "practical"],
      exampleInput: "3\n24 3 3",
      exampleOutput: "17.00",
      explanation: "Waiting times: 0, 24, 27 → average (0+24+27)/3 = 17.00",
      snippets: runModeSnippets({
        cBody:
          "    int n;\n    scanf(\"%d\", &n);\n    int bt[n];\n    for (int i = 0; i < n; i++) scanf(\"%d\", &bt[i]);\n    // Write your code here\n",
        cppBody:
          "    int n;\n    cin >> n;\n    vector<int> bt(n);\n    for (int i = 0; i < n; i++) cin >> bt[i];\n    // Write your code here\n",
        javaBody:
          "        int n = sc.nextInt();\n        int[] bt = new int[n];\n        for (int i = 0; i < n; i++) bt[i] = sc.nextInt();\n        // Write your code here\n",
        pythonBody:
          "n = int(input())\nbt = list(map(int, input().split()))\n# Write your code here\n",
      }),
    }),
  ],
  "CS302::Memory Management": [
    makePractical({
      title: "First Fit Memory Allocation",
      description:
        "Read m block sizes, then n process sizes. Allocate each process to the first block that fits. Print allocated block index (0-based) for each process, or -1 if not allocated. Blocks are not split further once used.",
      difficulty: Difficulty.MEDIUM,
      tags: ["os", "memory", "practical"],
      exampleInput: "5\n100 500 200 300 600\n4\n212 417 112 426",
      exampleOutput: "1 4 2 -1",
      explanation: "Classic first-fit allocation example.",
      snippets: runModeSnippets({
        cBody:
          "    int m;\n    scanf(\"%d\", &m);\n    // Write your code here\n",
        cppBody:
          "    int m;\n    cin >> m;\n    // Write your code here\n",
        javaBody:
          "        int m = sc.nextInt();\n        // Write your code here\n",
        pythonBody: "m = int(input())\n# Write your code here\n",
      }),
    }),
  ],
  "CS302::File Systems": [
    makePractical({
      title: "Simulate Contiguous File Allocation",
      description:
        "Disk has size blocks numbered 0..size-1 (initially free). Read q requests of (start length). For each request print ALLOCATED if the range is free and mark it used, else print FAILED.",
      difficulty: Difficulty.MEDIUM,
      tags: ["os", "file-systems", "practical"],
      exampleInput: "10 3\n0 3\n2 2\n5 4",
      exampleOutput: "ALLOCATED\nFAILED\nALLOCATED",
      explanation:
        "First request takes 0-2; second overlaps; third takes 5-8.",
      snippets: runModeSnippets({
        cBody:
          "    int size, q;\n    scanf(\"%d %d\", &size, &q);\n    // Write your code here\n",
        cppBody:
          "    int size, q;\n    cin >> size >> q;\n    // Write your code here\n",
        javaBody:
          "        int size = sc.nextInt();\n        int q = sc.nextInt();\n        // Write your code here\n",
        pythonBody:
          "size, q = map(int, input().split())\n# Write your code here\n",
      }),
    }),
  ],
};

async function seedPracticalsForUnit(unit, subjectCode, userId) {
  const key = `${subjectCode}::${unit.title}`;
  const practicals = PRACTICALS_BY_UNIT[key] || [];

  for (const practical of practicals) {
    const existing = await prisma.problem.findFirst({
      where: {
        title: practical.title,
        type: ProblemType.PRACTICAL,
        unitId: unit.id,
      },
    });

    if (existing) {
      console.log(`    Practical already exists: ${practical.title}`);
      continue;
    }

    const created = await prisma.problem.create({
      data: {
        ...practical,
        unitId: unit.id,
        userId,
      },
    });
    console.log(`    Seeded practical: ${created.title}`);
  }
}

/**
 * Existing accounts are left untouched rather than upserted, so re-running the
 * seed never resets a password somebody has already changed.
 */
async function seedFaculty() {
  const existing = await prisma.user.findUnique({
    where: { email: FACULTY.email },
  });

  if (existing) {
    console.log(`Faculty already exists: ${FACULTY.email}`);
    return existing;
  }

  const faculty = await prisma.user.create({
    data: {
      name: FACULTY.name,
      email: FACULTY.email,
      password: await bcrypt.hash(FACULTY.password, 10),
      role: UserRole.FACULTY,
      mustChangePassword: true,
      provisionedByAdmin: true,
    },
  });

  console.log(`Seeded faculty: ${FACULTY.email} / ${FACULTY.password}`);
  return faculty;
}

async function seedStudents() {
  for (const student of STUDENTS) {
    const existing = await prisma.user.findUnique({
      where: { enrollmentNo: student.enrollmentNo },
    });

    if (existing) {
      console.log(`  Student already exists: ${student.enrollmentNo}`);
      continue;
    }

    await prisma.user.create({
      data: {
        name: student.name,
        email: student.email,
        enrollmentNo: student.enrollmentNo,
        password: await bcrypt.hash(student.enrollmentNo, 10),
        role: UserRole.USER,
        mustChangePassword: true,
        provisionedByAdmin: true,
      },
    });

    console.log(
      `  Seeded student: ${student.enrollmentNo} (${student.name}) — password is the enrollment number`
    );
  }
}

async function seedBatches() {
  for (const definition of BATCHES) {
    const existing = await prisma.batch.findUnique({
      where: {
        enrollmentPrefix_name: {
          enrollmentPrefix: definition.enrollmentPrefix,
          name: definition.name,
        },
      },
      include: { _count: { select: { members: true } } },
    });

    if (existing) {
      console.log(
        `  Batch already exists: Section ${existing.name} (${existing._count.members} enrolled)`
      );
      continue;
    }

    const batch = await prisma.batch.create({ data: definition });
    console.log(
      `  Seeded batch: Section ${batch.name} — ${batch.enrollmentPrefix}${String(
        batch.serialStart
      ).padStart(4, "0")}..${String(batch.serialEnd).padStart(4, "0")}`
    );
  }
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

  await seedFaculty();

  console.log("Students (Section A):");
  await seedStudents();

  console.log("Batches:");
  await seedBatches();

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

    for (const unitDef of units) {
      let unit = await prisma.unit.findFirst({
        where: { subjectId: subject.id, title: unitDef.title },
      });

      if (unit) {
        console.log(`  Unit already exists: ${unit.title}`);
      } else {
        unit = await prisma.unit.create({
          data: {
            title: unitDef.title,
            order: unitDef.order,
            subjectId: subject.id,
          },
        });
        console.log(`  Seeded unit: ${unit.title}`);
      }

      await seedPracticalsForUnit(unit, code, admin.id);
    }
  }

  const subjectCount = await prisma.subject.count();
  const unitCount = await prisma.unit.count();
  const practicalCount = await prisma.problem.count({
    where: { type: ProblemType.PRACTICAL },
  });
  const problemCount = await prisma.problem.count();

  console.log(`Total subjects: ${subjectCount}, total units: ${unitCount}`);
  console.log(`Total practicals: ${practicalCount}, total problems: ${problemCount}`);

  const studentCount = await prisma.user.count({ where: { role: UserRole.USER } });
  const facultyCount = await prisma.user.count({
    where: { role: UserRole.FACULTY },
  });

  const batchCount = await prisma.batch.count();
  const memberCount = await prisma.batchMember.count();

  console.log(`Total students: ${studentCount}, total faculty: ${facultyCount}`);
  console.log(`Total batches: ${batchCount}, total enrollments: ${memberCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
