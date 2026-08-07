const BASE = "http://localhost:8000/api/v1";
const RUN_PROBLEM_ID = "62ed40ba-fd40-403b-b94d-5974799eca01";
const GRADE_PROBLEM_ID = "31f90120-a216-47eb-9a76-28be655aee8e"; // Add Two Numbers PRACTICE

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@leetlab.com",
      password: "admin123",
    }),
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const cookieHeader =
    setCookie.map((c) => c.split(";")[0]).join("; ") ||
    (res.headers.get("set-cookie") || "").split(",").map((c) => c.split(";")[0].trim()).join("; ");
  const data = await res.json();
  if (!res.ok) throw new Error(`login failed: ${JSON.stringify(data)}`);
  return cookieHeader;
}

async function run(cookie, payload) {
  const res = await fetch(`${BASE}/execute/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function getProblem(cookie, id) {
  const res = await fetch(`${BASE}/problems/get-problem/${id}`, {
    headers: { Cookie: cookie },
  });
  return res.json();
}

async function main() {
  const cookie = await login();
  console.log("logged in");

  const runProblem = await getProblem(cookie, RUN_PROBLEM_ID);
  console.log(
    "\n[1] Run problem executionMode:",
    runProblem.problem?.executionMode,
    "title:",
    runProblem.problem?.title
  );

  const gradeProblem = await getProblem(cookie, GRADE_PROBLEM_ID);
  console.log(
    "[4] Grade problem executionMode:",
    gradeProblem.problem?.executionMode,
    "title:",
    gradeProblem.problem?.title
  );

  // 1. Python valid stdout
  const pyOk = await run(cookie, {
    problemId: RUN_PROBLEM_ID,
    code: 'print("Hello")\n',
    language: "PYTHON",
    stdin: "",
  });
  console.log("\n=== TEST 1: Python valid ===");
  console.log(
    JSON.stringify(
      {
        http: pyOk.status,
        status: pyOk.data.status,
        stdout: pyOk.data.stdout,
        stderr: pyOk.data.stderr,
        compile_output: pyOk.data.compile_output,
        time: pyOk.data.time,
        memory: pyOk.data.memory,
      },
      null,
      2
    )
  );

  // 2. Python syntax error -> Runtime Error (NZEC / 11)
  const pyBad = await run(cookie, {
    problemId: RUN_PROBLEM_ID,
    code: "print(1/\n",
    language: "PYTHON",
    stdin: "",
  });
  console.log("\n=== TEST 2: Python syntax error ===");
  console.log(
    JSON.stringify(
      {
        http: pyBad.status,
        status: pyBad.data.status,
        stdout: pyBad.data.stdout,
        stderr: pyBad.data.stderr,
        compile_output: pyBad.data.compile_output,
      },
      null,
      2
    )
  );

  // 3. C++ compile error
  const cppBad = await run(cookie, {
    problemId: RUN_PROBLEM_ID,
    code: "int main() {\n  return 0\n}\n",
    language: "CPP",
    stdin: "",
  });
  console.log("\n=== TEST 3: C++ compile error ===");
  console.log(
    JSON.stringify(
      {
        http: cppBad.status,
        status: cppBad.data.status,
        stdout: cppBad.data.stdout,
        stderr: cppBad.data.stderr,
        compile_output: cppBad.data.compile_output,
      },
      null,
      2
    )
  );

  // 3b. C compile error as backup
  const cBad = await run(cookie, {
    problemId: RUN_PROBLEM_ID,
    code: "int main() {\n  return 0\n}\n",
    language: "C",
    stdin: "",
  });
  console.log("\n=== TEST 3b: C compile error ===");
  console.log(
    JSON.stringify(
      {
        http: cBad.status,
        status: cBad.data.status,
        compile_output: cBad.data.compile_output,
        stderr: cBad.data.stderr,
      },
      null,
      2
    )
  );

  // 4. Graded endpoint still works (smoke) — should NOT use /execute/run
  const gradeRes = await fetch(`${BASE}/execute-code`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: JSON.stringify({
      source_code:
        gradeProblem.problem?.referenceSolution?.PYTHON ||
        gradeProblem.problem?.codeSnippets?.PYTHON ||
        "print(1)",
      language_id: 71,
      stdin: ["1 2"],
      expected_outputs: ["3"],
      problemId: GRADE_PROBLEM_ID,
    }),
  });
  const gradeData = await gradeRes.json();
  console.log("\n=== TEST 4: JUDGE0_GRADE execute-code still works ===");
  console.log(
    JSON.stringify(
      {
        http: gradeRes.status,
        success: gradeData.success,
        hasSubmission: Boolean(gradeData.submission),
        status: gradeData.submission?.status,
        testCaseCount: gradeData.submission?.testCases?.length,
      },
      null,
      2
    )
  );

  // Run endpoint rejects graded problem
  const reject = await run(cookie, {
    problemId: GRADE_PROBLEM_ID,
    code: 'print("x")',
    language: "PYTHON",
  });
  console.log("\n=== Run endpoint on GRADE problem (expect 400) ===");
  console.log(JSON.stringify({ http: reject.status, data: reject.data }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
