import type { WritingPrompt } from "../types";

export const toeicWriting: WritingPrompt[] = [
  {
    id: "toeic-wr-001",
    track: "toeic",
    taskType: "opinion_essay",
    title: "Opinion Essay: Working from Home",
    titleZh: "观点作文：在家办公",
    promptEn: `Do you agree or disagree with the following statement? "Companies should allow employees to work from home two or three days per week." Use specific reasons and examples from your own knowledge or experience to support your opinion. Write at least 120 words.`,
    promptZh: `你是否同意以下观点？"公司应该允许员工每周在家办公两到三天。"请结合你自己的知识或经历，用具体的理由和例子支持你的观点。不少于 120 词。`,
    minWords: 120,
    suggestedMinutes: 20,
    modelAnswer: `I strongly agree that companies should allow employees to work from home two or three days per week, because a hybrid schedule benefits both workers and employers.

First, remote days give employees back the time they normally lose to commuting. In large cities, many people spend two hours a day on crowded trains or highways. When my own team switched to a hybrid schedule, colleagues used that recovered time to exercise, care for their families, or simply start work earlier with more energy.

Second, working from home suits tasks that require deep concentration. Writing reports, analyzing data, and preparing presentations are often done faster in a quiet home office than in a noisy open-plan workplace, so productivity actually rises rather than falls.

Of course, some meetings and brainstorming sessions work better face to face. That is exactly why a hybrid model, rather than fully remote work, is the ideal balance: two or three home days for focused work, and office days for collaboration. For these reasons, I believe flexible companies will attract better people and get better results.`,
    checklist: [
      {
        en: "Did you state a clear position (agree or disagree) in the first paragraph?",
        zh: "第一段是否明确表达了你的立场（同意或不同意）？",
      },
      {
        en: "Did you support each reason with a specific example or personal experience?",
        zh: "每个理由是否都有具体例子或个人经历支撑？",
      },
      {
        en: "Did you acknowledge the other side or a limitation before concluding?",
        zh: "结尾前是否提及了对立观点或该做法的局限性？",
      },
      {
        en: "Did you use linking words (first, second, of course, for these reasons) to organize paragraphs?",
        zh: "是否使用了衔接词（first、second、of course、for these reasons 等）组织段落？",
      },
      {
        en: "Is your essay at least 120 words with a short concluding sentence?",
        zh: "文章是否达到 120 词以上并有简短的结论句？",
      },
    ],
  },
  {
    id: "toeic-wr-002",
    track: "toeic",
    taskType: "business_email",
    title: "E-mail Reply: Office Recycling Program",
    titleZh: "邮件回复：办公室回收计划",
    promptEn: `Read the following e-mail, then write a reply. "From: Elaine Carter, Office Manager — Subject: New recycling program. Dear colleagues, next month we will launch a recycling program on every floor. I would welcome your ideas for making it successful, and I would like to know who can join a short planning lunch this Friday at noon." In your reply to Ms. Carter, make TWO suggestions for the recycling program and ask ONE question. Write at least 80 words.`,
    promptZh: `阅读下面的邮件并撰写回复。"发件人：办公室主任 Elaine Carter — 主题：新的回收计划。各位同事，下个月我们将在每个楼层启动回收计划。欢迎大家提出让计划成功的建议，同时请告知谁能参加本周五中午的简短计划午餐会。"在给 Carter 女士的回复中，提出两条关于回收计划的建议，并提出一个问题。不少于 80 词。`,
    minWords: 80,
    suggestedMinutes: 15,
    modelAnswer: `Dear Ms. Carter,

Thank you for organizing the new recycling program — I think it is an excellent initiative, and I would be happy to join the planning lunch this Friday at noon.

I would like to offer two suggestions. First, could we place clearly labeled bins for paper, plastic, and cans next to every printer station? People are far more likely to sort waste when the bins are close and the labels include pictures. Second, I suggest sending a short monthly e-mail showing how much material each floor has recycled; a little friendly competition between departments should keep everyone motivated.

I also have one question: will the program accept used batteries and other electronic waste, or only everyday materials?

I look forward to discussing this on Friday.

Best regards,
Wei Zhang`,
    checklist: [
      {
        en: "Did you include exactly two suggestions and one question, as the task requires?",
        zh: "是否按题目要求恰好提出了两条建议和一个问题？",
      },
      {
        en: "Did you open and close the e-mail politely (Dear Ms. Carter / Best regards)?",
        zh: "邮件开头和结尾是否使用了礼貌用语（Dear Ms. Carter / Best regards）？",
      },
      {
        en: "Did you respond to the lunch invitation mentioned in the original e-mail?",
        zh: "是否回应了原邮件中提到的午餐会邀请？",
      },
      {
        en: "Are your suggestions specific and practical rather than vague?",
        zh: "你的建议是否具体可行，而非空泛笼统？",
      },
      {
        en: "Is the tone professional and friendly throughout, with at least 80 words?",
        zh: "全文语气是否专业友好，且达到 80 词以上？",
      },
    ],
  },
];
