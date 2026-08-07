import axios from "axios"

export const getJudge0LanguageId = (language) => {
    const languageMap = {
        "PYTHON": 71,
        "JAVASCRIPT": 63,
        "JAVA": 62,
        "C": 50,       // C (GCC 9.2.0)
        "CPP": 54,     // C++ (GCC 9.2.0)
        "C++": 54,
    }

    return languageMap[language.toUpperCase()]
}

export const submitBatch = async (submissions) => {
    const {data} = await axios.post(`${process.env.JUDGE0_API_URL}/submissions/batch?base64_encoded=false`, {
        submissions,
    })

    console.log("Submission Results:", data)

    return data
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function decodeBase64Field(value) {
    if (value == null || value === "") return null;
    try {
        return Buffer.from(value, "base64").toString("utf8");
    } catch {
        return value;
    }
}

function decodeJudge0Result(data) {
    if (!data || typeof data !== "object") return data;
    return {
        ...data,
        stdout: decodeBase64Field(data.stdout),
        stderr: decodeBase64Field(data.stderr),
        compile_output: decodeBase64Field(data.compile_output),
        message: decodeBase64Field(data.message),
    };
}

/**
 * Single submission with wait=true.
 * Uses base64_encoded=true so GCC compile errors (often non-UTF-8) still return.
 */
export const submitAndWait = async ({ source_code, language_id, stdin = "" }) => {
    const { data } = await axios.post(
        `${process.env.JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`,
        {
            source_code: Buffer.from(source_code ?? "", "utf8").toString("base64"),
            language_id,
            stdin: Buffer.from(stdin ?? "", "utf8").toString("base64"),
        }
    );

    // Rare: wait=true still returns only a token (e.g. encoding issues) — poll once with base64
    if (data?.token && !data?.status) {
        await sleep(500);
        const polled = await axios.get(
            `${process.env.JUDGE0_API_URL}/submissions/${data.token}`,
            { params: { base64_encoded: true } }
        );
        return decodeJudge0Result(polled.data);
    }

    return decodeJudge0Result(data);
}

export const pollBatchResults = async (tokens) => {
    while(true) {
        const {data} = await axios.get(`${process.env.JUDGE0_API_URL}/submissions/batch`, {
            params: {
                tokens: tokens.join(','),
                base64_encoded: false,
            }
        })

        const results = data.submissions

        const isAllDone = results.every((res)=>res.status.id !== 1 && res.status.id !== 2)

        if(isAllDone) {
            console.log("Final Results:", results)
            return results
        }

        await sleep(1000)
    }
}


export function getLanguageName(languageId) {
    const LANGUAGE_NAMES = {
        50: "C",
        54: "C++",
        62: "Java",
        63: "JavaScript",
        71: "Python",
        74: "Typescript",
    };
    return LANGUAGE_NAMES[languageId] || "Unknown";
}
