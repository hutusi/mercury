import type { SpeakingPrompt } from "../types";

export const businessSpeaking: SpeakingPrompt[] = [
  {
    id: "biz-s-001",
    track: "business",
    partType: "business_scenario",
    title: "60-Second Professional Self-Introduction",
    titleZh: "60 秒职业自我介绍",
    promptEn: `You are at an industry networking event and someone asks, "So, tell me about yourself." Give a 60-second professional self-introduction: who you are, what you do and for whom, one concrete achievement or strength, and what you are looking for or interested in right now.`,
    promptZh: `你正在参加一场行业交流活动，有人对你说："介绍一下你自己吧。"请做一个 60 秒的职业自我介绍：你是谁、在哪家公司做什么、一项具体的成就或优势，以及你目前在关注或寻找什么。`,
    prepSeconds: 30,
    speakSeconds: 60,
    modelAnswer: `Hi, I'm Wei Zhang — great to meet you. I'm a supply chain manager at Nordwind Electronics; we make smart-home devices, and my team looks after sourcing and logistics across our Asia-Pacific suppliers. I've been doing this for about six years now. The thing I'm probably proudest of is a dual-sourcing program I led last year — when one of our chip suppliers had a fire at their plant, we switched over in three days instead of the six weeks it would've taken before, so we didn't miss a single shipment. Right now I'm really interested in how AI forecasting can cut inventory costs, and honestly, that's half the reason I came tonight — I'm hoping to meet people who've actually implemented it. What about you — what brings you here?`,
    checklist: [
      {
        en: "Did you cover all four elements: name and role, company and scope, one achievement, current interest?",
        zh: "是否涵盖四个要素：姓名与职位、公司与职责范围、一项成就、当前关注点？",
      },
      {
        en: "Was your achievement concrete, with a number or a result someone can remember?",
        zh: "你的成就是否具体，带有让人记得住的数字或结果？",
      },
      {
        en: "Did you end by turning the conversation back to the other person?",
        zh: "结尾是否把话题转回对方，促成双向交流？",
      },
      {
        en: "Did you sound warm and conversational rather than like a recited resume?",
        zh: "听起来是否亲切自然，而不是在背简历？",
      },
      {
        en: "Did you stay within roughly 60 seconds without rushing the ending?",
        zh: "是否控制在约 60 秒内，结尾没有仓促收场？",
      },
    ],
  },
  {
    id: "biz-s-002",
    track: "business",
    partType: "business_scenario",
    title: "Kicking Off a Project Meeting",
    titleZh: "主持项目启动会",
    promptEn: `You are the project lead for the launch of a new mobile app, and this is the kickoff meeting with six colleagues from engineering, design, and marketing. Open the meeting: welcome everyone, state the purpose and the goal of the project, walk through the agenda briefly, and set one or two ground rules before handing over to the first speaker.`,
    promptZh: `你是新款手机应用发布项目的负责人，现在要与来自研发、设计和市场部的六位同事召开启动会。请为会议开场：欢迎大家、说明会议目的和项目目标、简要过一遍议程，并在把话筒交给第一位发言人之前定下一两条会议规则。`,
    prepSeconds: 30,
    speakSeconds: 90,
    modelAnswer: `Good morning, everyone — thanks for making time, I know calendars are tight this week. For those I haven't worked with before, I'm Chen Jing, and I'll be leading this project.

So, why are we here? Today is the official kickoff for the Atlas mobile app launch. Our goal is simple to say and hard to do: we ship version one to both app stores by 15 September, in time for the trade show. That gives us fourteen weeks.

Here's how I'd like to use the next hour. First, I'll spend ten minutes on the background — what customers told us and why now. Then Maya will walk us through the design concept, Tom will cover the technical approach and the main risks, and Priya will outline the marketing plan. We'll keep the last fifteen minutes for open discussion and next steps.

Two quick ground rules before we start. One — questions are welcome anytime, just jump in; I'd rather be interrupted than misunderstood. Two — we make decisions in this room, so if you disagree, say it here, not in the corridor afterwards.

Alright, if there are no questions about the agenda — Maya, the floor is yours.`,
    checklist: [
      {
        en: "Did you state the project goal in one clear, memorable sentence with a deadline?",
        zh: "是否用一句清晰好记、带截止日期的话说明了项目目标？",
      },
      {
        en: "Did you preview the agenda and name who speaks on each item?",
        zh: "是否预告了议程，并点明每个环节由谁发言？",
      },
      {
        en: "Did you set explicit ground rules for the discussion?",
        zh: "是否明确定下了讨论规则？",
      },
      {
        en: "Did you hand over smoothly to the first speaker at the end?",
        zh: "结尾是否顺畅地把发言权交给了第一位发言人？",
      },
      {
        en: "Did you sound confident and inclusive, thanking people and inviting questions?",
        zh: "语气是否自信且包容——感谢与会者并欢迎提问？",
      },
    ],
  },
  {
    id: "biz-s-003",
    track: "business",
    partType: "business_scenario",
    title: "Phone Call: Rescheduling a Client Meeting",
    titleZh: "电话沟通：与客户改约会议",
    promptEn: `You must call your client, Ms. Baker, to reschedule tomorrow's 2 p.m. product review because your technical director has been called away to handle an urgent customer issue. Make the call: apologise, explain briefly, propose two alternative times (Thursday 10 a.m. or Friday 3 p.m.), and confirm the next step before ending politely.`,
    promptZh: `由于你们的技术总监被临时调去处理紧急客户问题，你必须致电客户 Baker 女士，将明天下午两点的产品评审会改期。请完成这通电话：致歉、简要说明原因、提出两个备选时间（周四上午 10 点或周五下午 3 点），确认下一步安排后礼貌结束通话。`,
    prepSeconds: 20,
    speakSeconds: 60,
    modelAnswer: `Hello Ms. Baker, this is Li Wei from Nordwind — do you have a quick minute? I'm afraid I'm calling with a small change of plan. We're going to have to move tomorrow's two o'clock product review, and I'm very sorry for the short notice. Our technical director, David, has been called away to handle an urgent issue for another customer, and since you specifically wanted him there for the integration questions, I didn't want to run the session without him. Could we do Thursday at ten in the morning instead? Or if that doesn't work, Friday at three. Whichever suits you better — the demo itself is fully ready. Thursday at ten? Perfect. I'll send an updated calendar invitation within the hour, along with the agenda. Thanks so much for being flexible, Ms. Baker — and again, apologies for the change. See you Thursday. Goodbye.`,
    checklist: [
      {
        en: "Did you apologise early and give a brief, honest reason without over-explaining?",
        zh: "是否尽早致歉，并简要如实说明原因而不过度解释？",
      },
      {
        en: "Did you offer two specific alternative times rather than leaving it open?",
        zh: "是否给出了两个具体的备选时间，而不是让对方无从选择？",
      },
      {
        en: "Did you confirm the agreed time and state the follow-up action (sending a new invitation)?",
        zh: "是否确认了商定的时间，并说明后续动作（发送新的会议邀请）？",
      },
      {
        en: "Did you use polite telephone phrases (do you have a quick minute, I'm afraid, thanks for being flexible)?",
        zh: "是否使用了礼貌的电话用语（do you have a quick minute、I'm afraid、thanks for being flexible）？",
      },
      {
        en: "Did you close the call warmly and clearly instead of ending abruptly?",
        zh: "通话结束是否亲切、明确，而不是生硬挂断？",
      },
    ],
  },
];
