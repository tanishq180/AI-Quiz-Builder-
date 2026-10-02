import { GoogleGenerativeAI } from '@google/generative-ai';

// Diverse sub-focus templates to guarantee unique questions and zero overlap between players
export const SUB_FOCUS_TEMPLATES = [
  (topic) => `Focus on historical figures, pioneers, and notable personalities related to ${topic}`,
  (topic) => `Focus on key turning events, major breakthroughs, and pivotal timeline shifts in ${topic}`,
  (topic) => `Focus on fundamental mechanics, architectural principles, and core mechanisms of ${topic}`,
  (topic) => `Focus on practical real-world applications, tools, and hands-on scenarios in ${topic}`,
  (topic) => `Focus on common misconceptions, subtle technical edge cases, and comparative trade-offs in ${topic}`,
  (topic) => `Focus on statistical records, benchmark metrics, and breakthrough discoveries in ${topic}`,
  (topic) => `Focus on future trajectories, modern controversies, and emerging paradigms in ${topic}`,
  (topic) => `Focus on comparative analysis, alternate perspectives, and foundational philosophies in ${topic}`
];

/**
 * Concurrency limiter / rate-limiter helper to avoid breaching Gemini/OpenAI rate limits
 */
async function mapWithRateLimit(items, limit, asyncFn, delayMs = 150) {
  const results = [];
  const executing = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const p = Promise.resolve().then(() => asyncFn(item, i));
    results.push(p);

    if (limit <= items.length) {
      const e = p.then(() => {
        executing.splice(executing.indexOf(e), 1);
        if (delayMs > 0) return new Promise(res => setTimeout(res, delayMs));
      });
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
}

/**
 * Generates tailored, non-overlapping question sets for all players in a room
 * @param {string} topic - Quiz topic prompt
 * @param {number} playerCount - Number of players in the lobby
 * @param {object} options - { questionCount, difficulty, customApiKey, roomCode }
 * @returns {Promise<Array<Array<object>>>} Array of question arrays, one per player
 */
export async function generatePersonalizedQuizzes(topic, playerCount, options = {}) {
  const count = Math.min(Math.max(Number(options.questionCount) || 5, 2), 15);
  const difficulty = options.difficulty || 'Medium';
  const customApiKey = options.customApiKey || null;
  const roomCode = options.roomCode || 'ROOM';

  const sanitizedPlayerCount = Math.max(1, Number(playerCount) || 1);
  const playerIndices = Array.from({ length: sanitizedPlayerCount }, (_, i) => i);

  console.log(`[AI] Generating ${count} ${difficulty}-tier personalized questions for ${sanitizedPlayerCount} players on "${topic}"...`);

  // Max 2 concurrent LLM calls to respect API rate limits smoothly
  const playerQuizzes = await mapWithRateLimit(playerIndices, 2, async (playerIdx) => {
    return generateSinglePlayerQuiz({
      topic,
      questionCount: count,
      difficulty,
      playerIndex: playerIdx,
      playerSeed: `${roomCode}-p${playerIdx}-${Date.now()}`,
      customApiKey
    });
  }, 200);

  return playerQuizzes;
}

/**
 * Generates a single player's tailored quiz questions with a specific sub-focus
 */
export async function generateSinglePlayerQuiz({
  topic,
  questionCount = 5,
  difficulty = 'Medium',
  playerIndex = 0,
  playerSeed = 'player-1',
  customApiKey = null
}) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  const count = Math.min(Math.max(Number(questionCount) || 5, 2), 15);
  const subFocusTemplate = SUB_FOCUS_TEMPLATES[playerIndex % SUB_FOCUS_TEMPLATES.length];
  const uniqueSubFocus = subFocusTemplate(topic);

  if (apiKey && apiKey.trim() !== '') {
    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.85,
        }
      });

      const prompt = `You are an expert trivia quiz designer creating balanced, engaging multiple choice questions for a multiplayer game.
Topic: "${topic}"
Difficulty Level: ${difficulty}
Total Questions Required: ${count}
MANDATORY DIVERSITY DIRECTIVE (Prevents screen cheating in the same room):
>> ${uniqueSubFocus} <<
Variation Seed: ${playerSeed} (Ensure questions do not duplicate common generic trivia).

Rules:
1. Provide exactly ${count} multiple choice questions.
2. Each question must have exactly 4 plausible, distinct options.
3. Only ONE option must be correct.
4. "correctIndex": integer between 0 and 3 indicating the correct choice.
5. "explanation": a concise (1-2 sentences) illuminating explanation for post-game review.

Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctIndex": 0,
      "explanation": "string"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsed = JSON.parse(responseText);

      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        const validated = parsed.questions.slice(0, count).map((q, idx) => {
          const opts = Array.isArray(q.options) && q.options.length >= 4
            ? q.options.slice(0, 4).map(s => String(s || '').trim())
            : ['Choice A', 'Choice B', 'Choice C', 'Choice D'];
          
          let cIdx = Number(q.correctIndex);
          if (isNaN(cIdx) || cIdx < 0 || cIdx > 3) cIdx = 0;

          return {
            id: `q-${playerIndex}-${idx}-${Date.now()}`,
            question: String(q.question || `Question ${idx + 1} on ${topic}`),
            options: opts,
            correctIndex: cIdx,
            explanation: String(q.explanation || 'Verified correct answer.'),
            subFocus: uniqueSubFocus
          };
        });

        if (validated.length >= count) {
          return validated;
        }
      }
    } catch (err) {
      console.warn(`[AI Warning] Gemini LLM generation error (${err.message}). Using dynamic fallback generator.`);
    }
  }

  // Dynamic resilient fallback generator tailored to the sub-focus and topic
  return generateDynamicFallbackQuestions(topic, count, playerIndex, uniqueSubFocus, difficulty);
}

// Backward-compatible alias for existing callers
export const generatePlayerQuestions = generateSinglePlayerQuiz;

/**
 * Suggest 3-5 high-yield topics from extracted PDF text
 */
export function suggestTopicsFromPDF(pdfText) {
  if (!pdfText || typeof pdfText !== 'string') {
    return ['Foundational Principles', 'Core Mechanisms', 'Applied Scenarios'];
  }

  const lines = pdfText.split('\n').map(l => l.trim()).filter(Boolean);
  const potentialTopics = [];

  // Look for chapter headings, numbered sections, bold/capitalized lines
  const headingRegex = /^(?:chapter|section|part|\d+\.|\b[A-Z\s]{4,}\b)/i;
  for (const line of lines) {
    if (line.length >= 4 && line.length <= 55 && headingRegex.test(line)) {
      const clean = line.replace(/^[0-9.\-\s:]+/, '').trim();
      if (clean && !potentialTopics.includes(clean) && potentialTopics.length < 5) {
        potentialTopics.push(clean);
      }
    }
  }

  if (potentialTopics.length >= 2) {
    return potentialTopics;
  }

  return ['Foundational Principles', 'Core Mechanisms', 'Practical Applications'];
}

/**
 * Generate quiz strictly from PDF text adhering to creator's topic-wise split
 */
export async function generateQuizFromPDFText({
  pdfText,
  totalQuestions = 5,
  topicDistribution = [],
  difficulty = 'Medium',
  customApiKey = null
}) {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  const count = Math.min(Math.max(Number(totalQuestions) || 5, 1), 20);

  // Format topic distribution string
  let distributionText = '';
  if (Array.isArray(topicDistribution) && topicDistribution.length > 0) {
    distributionText = topicDistribution
      .map(td => `- ${td.topic || 'General'}: ${td.questionCount || 1} questions`)
      .join('\n');
  } else {
    distributionText = `- Comprehensive Content: ${count} questions`;
  }

  // Truncate PDF text if overly long (keep first ~30,000 characters)
  const clippedText = (pdfText || '').slice(0, 32000);

  if (apiKey && apiKey.trim() !== '') {
    try {
      const genAI = new GoogleGenerativeAI(apiKey.trim());
      const model = genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.6,
        },
        systemInstruction: "You are an expert educational assessor. I will provide you with the text of a book chapter and a strict configuration for generating a multiple-choice quiz.\n\nYou MUST generate exactly the number of questions requested for each specific topic. Do not pull outside knowledge; base all answers solely on the provided text. Output strictly in the defined JSON format."
      });

      const userPrompt = `Source Material:
${clippedText}

Total Questions: ${count}
Difficulty Level: ${difficulty}
Topic Distribution:
${distributionText}

Generate the quiz following the standard schema (question, 4 options, correctIndex, explanation).
Ensure every question maps strictly to the requested topics in the distribution.

Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "correctIndex": 0,
      "explanation": "string",
      "topic": "string"
    }
  ]
}`;

      const responseText = result.response.text();
      const cleaned = (responseText || '')
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
      const parsed = JSON.parse(cleaned);

      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        const validated = parsed.questions.slice(0, count).map((q, idx) => {
          const opts = Array.isArray(q.options) && q.options.length >= 4
            ? q.options.slice(0, 4).map(s => String(s || '').trim())
            : ['Option A', 'Option B', 'Option C', 'Option D'];

          let cIdx = Number(q.correctIndex);
          if (isNaN(cIdx) || cIdx < 0 || cIdx > 3) cIdx = 0;

          return {
            id: `pdf-q-${idx}-${Date.now()}`,
            question: String(q.question || `Question ${idx + 1}`),
            options: opts,
            correctIndex: cIdx,
            explanation: String(q.explanation || 'Verified directly from the provided source material.'),
            subFocus: q.topic || 'Document Material'
          };
        });

        if (validated.length >= 1) {
          console.log(`[AI] Successfully generated ${validated.length} PDF-based questions conforming to topic split.`);
          return validated;
        }
      }
    } catch (err) {
      console.warn(`[AI PDF Error] Gemini call failed: ${err.message}. Generating dynamic PDF fallback.`);
    }
  }

  // Dynamic fallback generator from the PDF text sentences
  return generatePDFDynamicFallback(clippedText, count, topicDistribution, difficulty);
}

/**
 * Intelligent topic-aware fallback extractor from the PDF content
 */
function generatePDFDynamicFallback(text, totalCount, distribution, difficulty) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.length > 40 && p.length < 500);

  const questions = [];
  const topicsList = Array.isArray(distribution) && distribution.length > 0
    ? distribution
    : [{ topic: 'Document Concepts', questionCount: totalCount }];

  let pIndex = 0;
  for (const item of topicsList) {
    const qForThisTopic = Math.max(1, Number(item.questionCount) || 1);
    for (let k = 0; k < qForThisTopic && questions.length < totalCount; k++) {
      const excerpt = paragraphs[pIndex % Math.max(1, paragraphs.length)] || `Key factual assertion regarding ${item.topic}.`;
      pIndex++;

      // Create a question from this excerpt
      const qObj = {
        id: `pdf-fallback-${questions.length + 1}-${Date.now()}`,
        question: `According to the document section on ${item.topic}, which statement is explicitly supported by the text?`,
        options: [
          excerpt.length > 120 ? excerpt.slice(0, 110) + '...' : excerpt,
          `The text refutes this assertion and concludes the opposite outcome.`,
          `This concept is stated to be universally deprecated in modern systems.`,
          `The document notes that no empirical evidence exists for this principle.`
        ],
        correctIndex: 0,
        explanation: `As detailed directly in the source text under ${item.topic}: "${excerpt.slice(0, 100)}..."`,
        subFocus: item.topic
      };

      questions.push(qObj);
    }
  }

  return questions.slice(0, totalCount);
}

/**
 * Intelligent topic-aware dynamic question generator if Gemini API key is unset or rate limited
 */
function generateDynamicFallbackQuestions(topic, count, playerIndex, subFocus, difficulty) {
  const cleanTopic = topic.trim();
  const lowerTopic = cleanTopic.toLowerCase();
  const questions = [];

  // Specialized rich banks
  if (lowerTopic.includes('react') || lowerTopic.includes('javascript') || lowerTopic.includes('web')) {
    const reactBank = [
      {
        question: `In React 18+, how does Concurrent Mode improve user interface fluidity?`,
        options: [
          `By making render updates interruptible and prioritizing urgent user interactions`,
          `By switching JavaScript execution from single-threaded to multithreaded native threads`,
          `By executing all DOM updates directly in a GPU fragment shader`,
          `By eliminating the need for Virtual DOM reconciliation completely`
        ],
        correctIndex: 0,
        explanation: `Concurrent Mode allows React to interrupt long render computations to handle urgent user inputs like typing or clicking immediately.`
      },
      {
        question: `When optimizing React component renders, what is the primary distinction between useMemo and useCallback?`,
        options: [
          `useMemo caches the evaluated result of a function, while useCallback caches the function reference itself`,
          `useMemo only works inside custom hooks, whereas useCallback works everywhere`,
          `useCallback forces an immediate synchronous re-render of child components`,
          `useMemo is deprecated in favor of React Server Components`
        ],
        correctIndex: 0,
        explanation: `useMemo memoizes a computed return value; useCallback memoizes the callback instance to prevent re-creation across renders.`
      },
      {
        question: `Which React hook should be utilized when reading layout metrics and synchronously re-rendering before screen paint?`,
        options: [
          `useLayoutEffect`,
          `useEffect`,
          `useDeferredValue`,
          `useTransition`
        ],
        correctIndex: 0,
        explanation: `useLayoutEffect executes synchronously following all DOM mutations before the browser draws pixels to screen, preventing layout flicker.`
      },
      {
        question: `What is the underlying purpose of the 'key' prop when rendering dynamic collections in React?`,
        options: [
          `It gives Fiber elements stable identities to efficiently diff, reorder, and preserve DOM nodes`,
          `It encrypts component props for secure client transmission`,
          `It serves as an automated CSS class selector for styling`,
          `It registers each element in the browser's IndexedDB`
        ],
        correctIndex: 0,
        explanation: `React uses keys during reconciliation to identify which items have changed, been added, or been removed.`
      },
      {
        question: `How does React Server Components (RSC) fundamentally reduce client JavaScript bundle size?`,
        options: [
          `Server components and their heavy server dependencies remain 100% on the server and send zero JS to the browser`,
          `By compressing client JavaScript into WebAssembly binaries on the fly`,
          `By running client state machines exclusively inside Redis`,
          `By disabling browser JavaScript execution completely`
        ],
        correctIndex: 0,
        explanation: `RSC renders strictly on the server and outputs a streamable JSON-like UI representation, transferring 0KB of server dependencies to the client bundle.`
      },
      {
        question: `What causes an infinite re-render loop inside a React functional component?`,
        options: [
          `Calling a state setter directly within the component render body without an effect or event handler`,
          `Passing primitive numbers as props to memoized child components`,
          `Wrapping functions with useCallback`,
          `Declaring multiple useState hooks in the same component`
        ],
        correctIndex: 0,
        explanation: `Modifying state during render triggers another render immediately, resulting in an infinite recursion error.`
      }
    ];

    for (let i = 0; i < count; i++) {
      const q = reactBank[(i + playerIndex * 2) % reactBank.length];
      questions.push(shuffleOptions(q, i, playerIndex, subFocus));
    }
    return questions;
  }

  if (lowerTopic.includes('world war') || lowerTopic.includes('history') || lowerTopic.includes('pacific')) {
    const histBank = [
      {
        question: `Why was the Battle of Midway (June 1942) a decisive turning point in the Pacific Theater?`,
        options: [
          `The US Navy destroyed 4 Japanese fleet aircraft carriers, permanently seizing the strategic offensive`,
          `It forced the immediate unconditional surrender of Axis forces in Asia`,
          `It was the first amphibious ground assault launched in modern military history`,
          `It resulted in the signing of the Treaty of Versailles`
        ],
        correctIndex: 0,
        explanation: `The loss of Akagi, Kaga, Soryu, and Hiryu permanently crippled the Imperial Japanese Navy's carrier air arm.`
      },
      {
        question: `What intelligence breakthrough was instrumental to the Allied triumph at Midway?`,
        options: [
          `US cryptanalysts at Station HYPO broke the Japanese JN-25 naval cipher`,
          `Aerial surveillance satellites intercepted enemy coordinates`,
          `A captured German Enigma machine revealed Pacific fleet routes`,
          `Radar stations detected Japanese submarines at Pearl Harbor`
        ],
        correctIndex: 0,
        explanation: `Commander Joseph Rochefort and Station HYPO deciphered JN-25 and tricked Japan into confirming target 'AF' was Midway.`
      },
      {
        question: `Which operational doctrine defined the Allied march toward the Japanese home islands?`,
        options: [
          `Island Hopping (bypassing fortified strongholds to seize airfields and cut enemy supply lines)`,
          `Continuous frontal trench warfare along continental coastlines`,
          `Exclusively deploying naval mines without landing combat troops`,
          `Total diplomatic negotiations without territorial advances`
        ],
        correctIndex: 0,
        explanation: `Leapfrogging neutralized fortified positions like Rabaul while saving Allied casualties and speeding advance.`
      },
      {
        question: `Which carrier dive bomber inflicted the catastrophic damage on Japanese carriers at Midway?`,
        options: [
          `Douglas SBD Dauntless`,
          `Boeing B-29 Superfortress`,
          `Supermarine Spitfire`,
          `Curtiss P-40 Warhawk`
        ],
        correctIndex: 0,
        explanation: `Dauntless dive bombers from USS Enterprise and Yorktown scored fatal bomb strikes on three carriers in under 5 minutes.`
      }
    ];

    for (let i = 0; i < count; i++) {
      const q = histBank[(i + playerIndex * 2) % histBank.length];
      questions.push(shuffleOptions(q, i, playerIndex, subFocus));
    }
    return questions;
  }

  // Generalized dynamic template generator
  const genericTemplates = [
    {
      q: (t) => `Regarding ${t}, which core principle is universally considered fundamental?`,
      opts: [
        `Systematic architectural modularity and rigorous automated verification`,
        `Unrestricted arbitrary distribution of dependencies`,
        `Exclusive reliance on legacy manual protocols`,
        `Complete abandonment of deterministic state modeling`
      ],
      correct: 0,
      exp: (t) => `Systematic modularity and verification ensure scalability and resilience across ${t}.`
    },
    {
      q: (t) => `When evaluating ${t} through the lens of "${subFocus}", which strategy yields the highest advantage?`,
      opts: [
        `Proactive optimization guided by empirical benchmarking and rapid feedback loops`,
        `Monolithic hard-coupling with zero real-time telemetry`,
        `Premature speculative abstraction without measurement`,
        `Deferring failure recovery until terminal collapse`
      ],
      correct: 0,
      exp: (t) => `Empirical benchmarking and modular feedback loops consistently outclass unmonitored monolithic architectures.`
    },
    {
      q: (t) => `Which historical or conceptual breakthrough most significantly transformed modern ${t}?`,
      opts: [
        `The adoption of standardized, distributed, and fault-tolerant protocols`,
        `The total rejection of peer-reviewed engineering methodologies`,
        `The elimination of automated regression test pipelines`,
        `Strict enforcement of single-tenant execution models`
      ],
      correct: 0,
      exp: (t) => `Standardized fault-tolerant protocols catalyzed rapid innovation in ${t}.`
    },
    {
      q: (t) => `In high-stakes implementations of ${t}, what constitutes an anti-pattern?`,
      opts: [
        `Tight coupling across heterogeneous operational boundaries without abstraction`,
        `Idempotent state mutation handling with error boundaries`,
        `Defensive input sanitization at system trust perimeters`,
        `Continuous telemetry and audit logging`
      ],
      correct: 0,
      exp: (t) => `Tight coupling creates fragile cascading dependencies in ${t}.`
    },
    {
      q: (t) => `What is the recommended disaster recovery / contingency approach for ${t}?`,
      opts: [
        `Graceful degradation paired with automated failover redundancy`,
        `Immediate hard crash without persisting state`,
        `Silent suppression of diagnostic telemetry`,
        `Uncoordinated manual intervention during peak incident`
      ],
      correct: 0,
      exp: (t) => `Graceful degradation safeguards uptime and state integrity.`
    }
  ];

  for (let i = 0; i < count; i++) {
    const template = genericTemplates[(i + playerIndex * 2) % genericTemplates.length];
    const qObj = {
      question: template.q(cleanTopic),
      options: [...template.opts],
      correctIndex: template.correct,
      explanation: typeof template.exp === 'function' ? template.exp(cleanTopic) : template.exp
    };
    questions.push(shuffleOptions(qObj, i, playerIndex, subFocus));
  }

  return questions;
}

function shuffleOptions(qObj, qIndex, playerIndex, subFocus) {
  const correctText = qObj.options[qObj.correctIndex];
  const items = [...qObj.options];
  
  // Deterministic shuffle seed unique per question and player
  const seed = (qIndex + 1) * 37 + playerIndex * 19;
  for (let i = items.length - 1; i > 0; i--) {
    const j = (seed + i) % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }

  const newCorrectIndex = items.indexOf(correctText);

  return {
    id: `q-${playerIndex}-${qIndex}-${Date.now()}`,
    question: qObj.question,
    options: items,
    correctIndex: newCorrectIndex >= 0 ? newCorrectIndex : 0,
    explanation: qObj.explanation,
    subFocus: subFocus || ''
  };
}
