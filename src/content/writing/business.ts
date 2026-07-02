import type { WritingPrompt } from "../types";

export const businessWriting: WritingPrompt[] = [
  {
    id: "biz-wr-001",
    track: "business",
    taskType: "business_email",
    title: "E-mail: Informing a Client about a Project Delay",
    titleZh: "邮件：告知客户项目延期",
    promptEn: `You are the project manager for a website redesign for your client Horizon Retail. A key developer has been on sick leave, and the launch must be pushed back from 15 June to 29 June. Write an e-mail to your client contact, Ms. Laura Chen: apologise for the delay, briefly explain the cause, propose the new timeline, and offer something concrete to maintain goodwill. Write at least 100 words.`,
    promptZh: `你是客户 Horizon Retail 网站改版项目的项目经理。一名核心开发人员因病休假，上线日期必须从 6 月 15 日推迟到 6 月 29 日。请给客户联系人 Laura Chen 女士写一封邮件：为延期道歉、简要说明原因、提出新的时间表，并给出一项具体补偿以维护客户关系。不少于 100 词。`,
    minWords: 100,
    suggestedMinutes: 15,
    modelAnswer: `Dear Ms. Chen,

I am writing to let you know, with apologies, that we need to move the launch of the redesigned Horizon Retail website from 15 June to 29 June.

The reason is that our lead developer, who built the checkout integration, has been on unexpected sick leave for the past two weeks. Rather than hand his unfinished work to someone unfamiliar with it and risk quality issues at launch, we believe a two-week extension is the responsible choice.

Here is the revised timeline: internal testing will finish by 19 June, your team will have the staging site for review from 22 June, and we will go live on 29 June. To make up for the inconvenience, we will provide four weeks of post-launch support instead of the usual two, at no additional cost.

I am happy to walk you through the plan on a call this week — would Thursday morning suit you?

Kind regards,
Li Wei
Project Manager`,
    checklist: [
      {
        en: "Did you deliver the bad news early and clearly, rather than burying it at the end?",
        zh: "是否在邮件开头就清楚地传达了坏消息，而不是拖到最后？",
      },
      {
        en: "Did you explain the cause briefly and without blaming individuals or making excuses?",
        zh: "是否简要说明了原因，且没有推卸责任或过度找借口？",
      },
      {
        en: "Did you give a concrete new timeline with specific dates?",
        zh: "是否给出了包含具体日期的新时间表？",
      },
      {
        en: "Did you offer meaningful compensation or a goodwill gesture?",
        zh: "是否提供了有实际意义的补偿或善意举措？",
      },
      {
        en: "Did you end with a clear next step, such as proposing a call?",
        zh: "结尾是否提出了明确的下一步行动，例如约一次通话？",
      },
    ],
  },
  {
    id: "biz-wr-002",
    track: "business",
    taskType: "business_report",
    title: "Weekly Status Report: CRM Migration",
    titleZh: "周报：CRM 系统迁移",
    promptEn: `Write your weekly status report to your manager for the Aurora CRM migration project. Cover four areas: progress this week (customer data migration is 80% complete; training materials have been drafted), problems (a vendor API outage cost the team two days), plans for next week, and any support you need from management. Use short headings or a clear structure. Write at least 120 words.`,
    promptZh: `请就 Aurora CRM 迁移项目给你的经理写一份周报。需涵盖四个方面：本周进展（客户数据迁移已完成 80%，培训材料已完成初稿）、遇到的问题（供应商 API 故障耽误了团队两天）、下周计划，以及需要管理层提供的支持。请使用小标题或清晰的结构。不少于 120 词。`,
    minWords: 120,
    suggestedMinutes: 20,
    modelAnswer: `Subject: Aurora CRM Migration — Weekly Status, Week 12

Progress this week
Customer data migration reached 80% completion, covering all active accounts in the APAC and EMEA regions. The first draft of the end-user training materials is finished and is now with the sales operations team for review.

Problems
The vendor's API was unavailable from Tuesday afternoon to Thursday morning, which stopped all migration jobs and cost us roughly two working days. The vendor has confirmed the root cause and credited us for the downtime, but our buffer for this phase is now used up.

Plans for next week
We will migrate the remaining 20% of records, run the data-quality audit on a 5% sample, and schedule the first two training sessions for the sales team.

Support needed
To protect the go-live date of 30 July, I would like approval for up to 20 hours of contractor time in case the audit uncovers data issues. A decision by Wednesday would keep us on schedule.

Li Wei`,
    checklist: [
      {
        en: "Did you organize the report under clear headings (progress, problems, plans, support needed)?",
        zh: "报告是否按清晰的小标题组织（进展、问题、计划、所需支持）？",
      },
      {
        en: "Did you quantify progress with concrete figures instead of vague statements?",
        zh: "进展描述是否使用了具体数字，而非含糊表述？",
      },
      {
        en: "Did you state the impact of the problem and what has been done about it?",
        zh: "是否说明了问题造成的影响以及已采取的应对措施？",
      },
      {
        en: "Is your request for support specific and tied to a deadline or decision?",
        zh: "所请求的支持是否具体，并关联到明确的期限或决策？",
      },
      {
        en: "Is the tone factual and concise, without unnecessary apologies or padding?",
        zh: "语气是否客观简洁，没有多余的道歉或废话？",
      },
    ],
  },
  {
    id: "biz-wr-003",
    track: "business",
    taskType: "business_email",
    title: "E-mail: Responding to a Customer Complaint",
    titleZh: "邮件：回复客户投诉",
    promptEn: `A long-standing customer, Mr. Daniel Tan of Innova Labs, has written to complain that order #8823 arrived a week late and that two of the demonstration units inside were damaged, which disrupted a product demonstration for his own client. Write a reply: apologise sincerely, explain briefly what went wrong, state exactly how you will put it right, and offer appropriate compensation. Write at least 100 words.`,
    promptZh: `老客户、Innova Labs 的 Daniel Tan 先生来信投诉：8823 号订单晚到了一周，且其中两台演示设备损坏，影响了他为自己客户安排的产品演示。请写一封回复邮件：诚恳道歉、简要解释问题原因、明确说明补救措施，并提供适当的补偿。不少于 100 词。`,
    minWords: 100,
    suggestedMinutes: 15,
    modelAnswer: `Dear Mr. Tan,

Thank you for your message about order #8823, and please accept my sincere apologies. A late delivery is bad enough; damaged demonstration units that disrupted a presentation to your own client is a failure we take very seriously.

We have investigated immediately. The shipment was rerouted through a temporary distribution hub during last week's port congestion, where it was both delayed and mishandled. This does not excuse the outcome, but it explains it, and we have already stopped routing your orders through that hub.

Here is what we will do. Two replacement units were dispatched this morning by express courier and will reach you by Thursday, at our cost. We will also refund the full shipping charge for order #8823 and apply a 15% credit to your next invoice.

Your business over the past six years matters greatly to us. If there is anything further we can do to support your client demonstration, please call me directly on my mobile.

Yours sincerely,
Chen Jing
Customer Success Manager`,
    checklist: [
      {
        en: "Did you apologise sincerely and acknowledge the specific impact on the customer's business?",
        zh: "是否诚恳道歉，并明确承认了给客户业务造成的具体影响？",
      },
      {
        en: "Did you explain the cause honestly without sounding defensive?",
        zh: "是否如实解释了原因，而没有显得在辩解？",
      },
      {
        en: "Did you list concrete corrective actions with dates (replacement, refund, credit)?",
        zh: "是否列出了带时间的具体补救措施（换货、退款、抵扣）？",
      },
      {
        en: "Did you mention a preventive step so the problem will not recur?",
        zh: "是否提到了防止问题再次发生的措施？",
      },
      {
        en: "Did you close by valuing the relationship and offering a direct contact channel?",
        zh: "结尾是否表达了对合作关系的重视，并提供了直接联系方式？",
      },
    ],
  },
];
