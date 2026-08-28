import { db } from "../libs/db.js";
import {
  getJudge0LanguageId,
  getLanguageName,
  pollBatchResults,
  submitAndWait,
  submitBatch,
} from "../libs/judge0.lib.js";
import {
  PRACTICAL_FAILED,
  PRACTICAL_SUBMITTED,
} from "../libs/practicalStatus.js";
import { evaluateSubmissionWindow } from "./assignment.controller.js";

/** Raw compiler-style run for JUDGE0_RUN practicals — no test-case grading. */
export const executeRun = async (req, res) => {
  try {
    const { problemId, code, language, stdin } = req.body;

    if (!problemId || !code || !language) {
      return res
        .status(400)
        .json({ error: "problemId, code, and language are required" });
    }

    const problem = await db.problem.findUnique({
      where: { id: problemId },
      select: { id: true, executionMode: true, type: true },
    });

    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    // Practicals section is always Run mode; also allow explicit JUDGE0_RUN
    const allowsRun =
      problem.executionMode === "JUDGE0_RUN" || problem.type === "PRACTICAL";
    if (!allowsRun) {
      return res.status(400).json({
        error: "This problem does not support Run mode",
      });
    }

    const language_id = getJudge0LanguageId(language);
    if (!language_id) {
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    const result = await submitAndWait({
      source_code: code,
      language_id,
      stdin: stdin ?? "",
    });

    return res.status(200).json({
      success: true,
      stdout: result.stdout ?? null,
      stderr: result.stderr ?? null,
      compile_output: result.compile_output ?? null,
      status: result.status ?? null,
      time: result.time ?? null,
      memory: result.memory ?? null,
    });
  } catch (error) {
    console.error("Error running code:", error.message);
    return res.status(500).json({ error: "Failed to run code" });
  }
};

/**
 * Records a practical submission. The code is re-run server-side rather than
 * trusting the output the browser happens to be showing — faculty check these
 * outputs physically, so they have to be what the submitted code actually
 * produces. Resubmissions append, giving a timestamped history.
 */
export const submitPractical = async (req, res) => {
  try {
    const { problemId, code, language, stdin } = req.body;

    if (!problemId || !code || !language) {
      return res
        .status(400)
        .json({ error: "problemId, code, and language are required" });
    }

    const problem = await db.problem.findUnique({
      where: { id: problemId },
      select: { id: true, executionMode: true, type: true },
    });

    if (!problem) {
      return res.status(404).json({ error: "Problem not found" });
    }

    const allowsRun =
      problem.executionMode === "JUDGE0_RUN" || problem.type === "PRACTICAL";
    if (!allowsRun) {
      return res.status(400).json({
        error: "This problem is graded against test cases, not submitted",
      });
    }

    const language_id = getJudge0LanguageId(language);
    if (!language_id) {
      return res.status(400).json({ error: `Unsupported language: ${language}` });
    }

    // Checked before spending a Judge0 run on work that will be refused.
    const window = await evaluateSubmissionWindow(req.user.id, problemId);
    if (!window.allowed) {
      return res.status(403).json({
        error: window.reason ?? "Submissions are closed for this practical",
        code: "SUBMISSION_CLOSED",
      });
    }

    const result = await submitAndWait({
      source_code: code,
      language_id,
      stdin: stdin ?? "",
    });

    // Judge0 status 3 is "Accepted", which for an ungraded run just means the
    // program compiled and exited cleanly.
    const ran = result.status?.id === 3;

    const submission = await db.submission.create({
      data: {
        userId: req.user.id,
        problemId,
        sourceCode: code,
        language: getLanguageName(language_id),
        stdin: stdin ?? "",
        stdout: result.stdout ?? null,
        stderr: result.stderr ?? null,
        complieOutput: result.compile_output ?? null,
        status: ran ? PRACTICAL_SUBMITTED : PRACTICAL_FAILED,
        memory: result.memory ? `${result.memory} KB` : null,
        time: result.time ? `${result.time} sec` : null,
      },
    });

    // A practical counts as done once it runs; there is nothing to grade. Broken
    // code is still stored so the attempt is not lost, but it does not count.
    if (ran) {
      await db.problemSolved.upsert({
        where: { userId_problemId: { userId: req.user.id, problemId } },
        update: {},
        create: { userId: req.user.id, problemId },
      });
    }

    return res.status(201).json({
      success: true,
      message: ran
        ? window.isLate
          ? "Practical submitted late"
          : "Practical submitted successfully"
        : "Submission saved, but your code did not run cleanly",
      ran,
      isLate: window.isLate,
      assignment: window.assignment,
      submission,
    });
  } catch (error) {
    console.error("Error submitting practical:", error.message);
    return res.status(500).json({ error: "Failed to submit practical" });
  }
};

export const executeCode = async (req, res) => {
  try {
    const { source_code, language_id, stdin, expected_outputs, problemId } =
      req.body;

    const userId = req.user.id;

    // Validate test cases

    if (
      !Array.isArray(stdin) ||
      stdin.length === 0 ||
      !Array.isArray(expected_outputs) ||
      expected_outputs.length !== stdin.length
    ) {
      return res.status(400).json({ error: "Invalid or Missing test cases" });
    }

    // 2. Prepare each test cases for judge0 batch submission
    const submissions = stdin.map((input) => ({
      source_code,
      language_id,
      stdin: input,
    }));

    // 3. Send batch of submissions to judge0
    const submitResponse = await submitBatch(submissions);

    const tokens = submitResponse.map((res) => res.token);

    // 4. Poll judge0 for results of all submitted test cases
    const results = await pollBatchResults(tokens);

    console.log("Results:--------------------", results);

    // Analyze test case results
    let allPassed = true;
    const detailedResults = results.map((res, i) => {
      const stdout = res.stdout?.trim();
      const expected_output = expected_outputs[i]?.trim();
      const passed = res.status.id === 3 && stdout === expected_output;

      if (!passed) {
        allPassed = false;
      }

      return {
        testCase: i + 1,
        passed,
        stdout,
        expected: expected_output,
        stderr: res.stderr || null,
        compile_output: res.compile_output || null,
        status: res.status.description,
        memory: res.memory ? `${res.memory} KB` : undefined,
        time: res.time ? `${res.time} sec` : undefined,
      };

      // console.log(`Test Case ${i + 1}:`);
      // console.log(`Input: ${stdin[i]}`);
      // console.log(`Expected Output: ${expected_output}`);
      // console.log(`Actual Output: ${stdout}`);

      // console.log(`Matched: ${passed}`);
      // console.log('-------------------------');
    });
    console.log("Detailed Results:", detailedResults);

    // Store submission summary
    const submission = await db.submission.create({
      data: {
        userId,
        problemId,
        sourceCode: source_code,
        language: getLanguageName(language_id),
        stdin: stdin.join("\n"),
        stdout: JSON.stringify(detailedResults.map((r) => r.stdout)),
        stderr: detailedResults.some((r) => r.stderr)
          ? JSON.stringify(detailedResults.map((r) => r.stderr))
          : null,
        complieOutput: detailedResults.some((r) => r.compile_output)
          ? JSON.stringify(detailedResults.map((r) => r.compile_output))
          : null,
        status: allPassed ? "Accepted" : "Wrong Answer",
        memory: detailedResults.some((r) => r.memory)
          ? JSON.stringify(detailedResults.map((r) => r.memory))
          : null,
        time: detailedResults.some((r) => r.time)
          ? JSON.stringify(detailedResults.map((r) => r.time))
          : null,
      },
    });

    // If all passed = true, mark problem as solved for the current user
    if (allPassed) {
      await db.problemSolved.upsert({
        where: {
          userId_problemId: {
            userId,
            problemId,
          },
        },
        update: {},
        create: {
          userId,
          problemId,
        },
      });
    }

    // Save individual test case results

    const testCaseResults = detailedResults.map((result) => ({
      submissionId: submission.id,
      testCase: result.testCase,
      passed: result.passed,
      stdout: result.stdout,
      expected: result.expected,
      stderr: result.stderr,
      complieOutput: result.compile_output,
      status: result.status,
      memory: result.memory,
      time: result.time,
    }));

    await db.testCaseResult.createMany({
        data: testCaseResults,
    })

    const submissionWithTestCase = await db.submission.findUnique({
        where: { id: submission.id },
        include: { testCases: true },
    })
    // 

    res.status(200).json({ 
        success: true,
        message: "Code executed successfully",
        submission: submissionWithTestCase
    });
  } catch (error) {
     console.error("Error executing code:", error.message);
    res.status(500).json({ error: "Failed to execute code" });
  }
};
