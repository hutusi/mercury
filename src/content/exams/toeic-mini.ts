import type { MockExam } from "../types";

export const toeicMiniExam: MockExam = {
  id: "exam-toeic-mini",
  track: "toeic",
  title: "Mini TOEIC Mock Exam",
  titleZh: "迷你托业全真模考",
  descriptionZh:
    "共 25 题：听力 12 题（两段对话 + 一段短讲）+ 阅读 13 题（电子邮件、备忘录、广告各一篇），约 25 分钟完成。",
  sections: [
    {
      id: "toeic-mini-listening",
      kind: "listening",
      title: "Listening",
      titleZh: "听力部分",
      durationSeconds: 600,
      groups: [
        {
          id: "tm-lg1",
          script: [
            {
              speaker: "A",
              text: "Hi Marcus, I just heard the Henderson clients moved their visit from Thursday to tomorrow morning.",
            },
            {
              speaker: "B",
              text: "Tomorrow? That doesn't give us much time. Is the main conference room available?",
            },
            {
              speaker: "A",
              text: "I checked the booking system — it's reserved for the marketing workshop until noon.",
            },
            {
              speaker: "B",
              text: "Then let's use the smaller room on the fifth floor. It seats ten people comfortably.",
            },
            {
              speaker: "A",
              text: "Good idea. But the projector in that room was sent out for repairs last week.",
            },
            {
              speaker: "B",
              text: "No problem — I'll borrow the portable one from the IT department this afternoon.",
            },
            {
              speaker: "A",
              text: "Perfect. Could you also print twenty copies of the proposal? I still have to finish the cost estimates tonight.",
            },
            {
              speaker: "B",
              text: "Sure. I'll e-mail you the final slides by six so you can review them before the meeting.",
            },
            {
              speaker: "A",
              text: "Thanks. Let's meet at eight thirty tomorrow to set everything up.",
            },
          ],
          questions: [
            {
              id: "tm-l-q01",
              stem: "What are the speakers mainly discussing?",
              options: [
                "Postponing a marketing workshop",
                "Repairing some office equipment",
                "Preparing for a client visit",
                "Hiring a new IT technician",
              ],
              correctIndex: 2,
              explanationZh:
                '对话开头女士说 "the Henderson clients moved their visit... to tomorrow morning"，随后两人围绕会议室、投影仪和材料展开准备，因此主题是为客户来访做准备。',
            },
            {
              id: "tm-l-q02",
              stem: "Why can't the speakers use the main conference room?",
              options: [
                "It is booked for a workshop",
                "Its projector is being repaired",
                "It is too small for the group",
                "It is being cleaned tomorrow",
              ],
              correctIndex: 0,
              explanationZh:
                '女士查过预订系统后说主会议室 "it\'s reserved for the marketing workshop until noon"，即被市场部工作坊占用。送修的是五楼小会议室的投影仪，属于干扰项。',
            },
            {
              id: "tm-l-q03",
              stem: "What does the man offer to do?",
              options: [
                "Finish the cost estimates",
                "Reserve the main conference room",
                "Call the Henderson clients",
                "Borrow a portable projector",
              ],
              correctIndex: 3,
              explanationZh:
                '男士说 "I\'ll borrow the portable one from the IT department this afternoon"，即去 IT 部门借便携投影仪。成本核算（cost estimates）是女士要做的事。',
            },
            {
              id: "tm-l-q04",
              stem: "What time will the speakers meet tomorrow?",
              options: ["At six o'clock", "At eight thirty", "At noon", "At ten o'clock"],
              correctIndex: 1,
              explanationZh:
                '对话结尾女士说 "Let\'s meet at eight thirty tomorrow to set everything up"。六点是男士发送幻灯片的时间，中午是工作坊结束的时间，均为干扰项。',
            },
          ],
        },
        {
          id: "tm-lg2",
          script: [
            {
              speaker: "A",
              text: "Hello, this is Priya Sharma from Calloway Design. I'm calling about our order of office chairs — order number 4471.",
            },
            {
              speaker: "B",
              text: "Let me pull that up... yes, twenty ergonomic chairs, scheduled for delivery this Friday.",
            },
            {
              speaker: "A",
              text: "That's the problem. We're moving into our new office on Wednesday, so Friday will be too late.",
            },
            {
              speaker: "B",
              text: "I see. Well, the chairs are already at our regional warehouse, so we may be able to move the date up.",
            },
            {
              speaker: "A",
              text: "That would be wonderful. Wednesday morning would be ideal, if possible.",
            },
            {
              speaker: "B",
              text: "I can arrange delivery for Tuesday afternoon instead — our trucks don't run to your area on Wednesdays.",
            },
            {
              speaker: "A",
              text: "Tuesday works even better, actually. Will there be an extra charge for the change?",
            },
            {
              speaker: "B",
              text: "Normally there's a fee for expedited delivery, but since you've ordered from us before, I'll waive it.",
            },
            {
              speaker: "A",
              text: "I appreciate that. I'll e-mail you the loading-dock instructions for the new building right away.",
            },
          ],
          questions: [
            {
              id: "tm-l-q05",
              stem: "Why is the woman calling?",
              options: [
                "To cancel an order of office chairs",
                "To change a delivery date",
                "To complain about damaged furniture",
                "To ask about a product warranty",
              ],
              correctIndex: 1,
              explanationZh:
                '女士说周三就要搬入新办公室，"so Friday will be too late"，希望提前送货。她并没有取消订单或投诉家具损坏。',
            },
            {
              id: "tm-l-q06",
              stem: "When will the chairs most likely be delivered?",
              options: [
                "On Friday",
                "On Wednesday morning",
                "On Thursday afternoon",
                "On Tuesday afternoon",
              ],
              correctIndex: 3,
              explanationZh:
                '男士提出 "I can arrange delivery for Tuesday afternoon instead"，女士回答 "Tuesday works even better"。周五是原定日期，周三上午只是女士最初的提议。',
            },
            {
              id: "tm-l-q07",
              stem: "What does the man say about the delivery fee?",
              options: [
                "He will waive it for a repeat customer",
                "It will be added to the invoice",
                "It doubles for expedited shipping",
                "It was already paid online",
              ],
              correctIndex: 0,
              explanationZh:
                "男士说加急配送通常收费，\"but since you've ordered from us before, I'll waive it\"，即因为对方是老客户而免除费用。",
            },
            {
              id: "tm-l-q08",
              stem: "What will the woman most likely do next?",
              options: [
                "Visit the regional warehouse",
                "Place an additional order",
                "Send loading-dock instructions",
                "Sign a delivery contract",
              ],
              correctIndex: 2,
              explanationZh:
                '对话结尾女士说 "I\'ll e-mail you the loading-dock instructions for the new building right away"，即马上发送新办公楼的卸货区说明。',
            },
          ],
        },
        {
          id: "tm-lg3",
          script: [
            {
              speaker: "narrator",
              text: "Good morning, everyone, and thank you for joining this brief announcement before you head to your departments.",
            },
            {
              speaker: "narrator",
              text: "Starting next Monday, the renovation of the third-floor break room will finally get under way.",
            },
            {
              speaker: "narrator",
              text: "The work is expected to last three weeks, and during that time the entire third-floor kitchen area will be closed.",
            },
            {
              speaker: "narrator",
              text: "In the meantime, staff may use the cafeteria on the ground floor, which will extend its hours until seven p.m.",
            },
            {
              speaker: "narrator",
              text: "We've also placed two temporary coffee stations near the east elevators, on the second and fourth floors.",
            },
            {
              speaker: "narrator",
              text: "When the renovation is complete, the new break room will include a quiet lounge and additional refrigerators.",
            },
            {
              speaker: "narrator",
              text: "If the construction noise interferes with your phone calls, feel free to reserve one of the meeting pods on the fifth floor.",
            },
            {
              speaker: "narrator",
              text: "Full details, including a floor map of the temporary facilities, were e-mailed to you this morning by the facilities team.",
            },
          ],
          questions: [
            {
              id: "tm-l-q09",
              stem: "What is the announcement mainly about?",
              options: [
                "A change in cafeteria menus",
                "An upcoming renovation project",
                "A new employee orientation",
                "A revised meeting schedule",
              ],
              correctIndex: 1,
              explanationZh:
                '讲话人宣布 "the renovation of the third-floor break room will finally get under way"，全文都在说明装修期间的临时安排，因此主题是即将开始的装修工程。',
            },
            {
              id: "tm-l-q10",
              stem: "How long is the work expected to take?",
              options: ["Three days", "One week", "Two months", "Three weeks"],
              correctIndex: 3,
              explanationZh:
                '原文明确说 "The work is expected to last three weeks"，即工期约三周。',
            },
            {
              id: "tm-l-q11",
              stem: "According to the speaker, what will the ground-floor cafeteria do?",
              options: [
                "Stay open later than usual",
                "Move to the third floor",
                "Close during the renovation",
                "Offer free coffee to staff",
              ],
              correctIndex: 0,
              explanationZh:
                '讲话人说员工可使用一楼餐厅，"which will extend its hours until seven p.m."，即营业时间延长到晚上七点。免费咖啡站设在二、四楼电梯旁，与餐厅无关。',
            },
            {
              id: "tm-l-q12",
              stem: "What is included in the e-mail from the facilities team?",
              options: [
                "A list of new menu items",
                "A construction budget",
                "A map of the temporary facilities",
                "A reservation form for meeting pods",
              ],
              correctIndex: 2,
              explanationZh:
                '结尾提到邮件包含全部细节，"including a floor map of the temporary facilities"，即临时设施的楼层平面图。',
            },
          ],
        },
      ],
    },
    {
      id: "toeic-mini-reading",
      kind: "reading",
      title: "Reading",
      titleZh: "阅读部分",
      durationSeconds: 900,
      groups: [
        {
          id: "tm-rg1",
          passage: `From: Dana Whitfield, Events Coordinator, Brightline Conferences
To: Registered attendees
Subject: Important venue change — Twelfth Annual Logistics Summit

Dear Attendee,

We are writing to inform you of an important change to the Twelfth Annual Logistics Summit, which you are registered to attend on October 12 and 13. Because the number of registrations has far exceeded our expectations, the event has been moved from the Harbor View Hotel to the Grandmont Convention Center, two blocks north on Meridian Avenue. The dates and the program remain unchanged.

The new venue offers a much larger exhibition hall, which means that all forty vendor booths will now be located in a single space rather than on separate floors. Complimentary shuttle buses will run between the Harbor View Hotel and the convention center every twenty minutes for attendees who have already booked rooms at the hotel.

Your registration badge will be available at the Grandmont's main lobby desk from 7:30 a.m. on October 12. If you have dietary requirements for the awards luncheon, please reply to this message no later than October 5. A parking voucher for the convention center garage is attached to this e-mail.

Sincerely,
Dana Whitfield
Events Coordinator, Brightline Conferences`,
          questions: [
            {
              id: "tm-r-q01",
              stem: "Why was the summit moved to a new venue?",
              options: [
                "The hotel closed for renovations",
                "The original venue raised its fees",
                "The program was extended by one day",
                "More people registered than expected",
              ],
              correctIndex: 3,
              explanationZh:
                '邮件说明原因是 "the number of registrations has far exceeded our expectations"，即报名人数远超预期，因此换到更大的会展中心。',
            },
            {
              id: "tm-r-q02",
              stem: "What is indicated about the vendor booths?",
              options: [
                "They will all be located in a single hall",
                "They will be spread across separate floors",
                "They will open at 7:30 a.m.",
                "They will be moved to the hotel lobby",
              ],
              correctIndex: 0,
              explanationZh:
                '原文说新场馆的展厅更大，"all forty vendor booths will now be located in a single space rather than on separate floors"，即四十个展位集中在同一空间。',
            },
            {
              id: "tm-r-q03",
              stem: "What are attendees with dietary requirements asked to do?",
              options: [
                "Call the Harbor View Hotel",
                "Visit the registration desk early",
                "Reply to the e-mail by October 5",
                "Contact the convention center garage",
              ],
              correctIndex: 2,
              explanationZh:
                '邮件要求有饮食需求的与会者 "please reply to this message no later than October 5"，即在 10 月 5 日前回复本邮件。',
            },
            {
              id: "tm-r-q04",
              stem: "What is attached to the e-mail?",
              options: [
                "A shuttle bus schedule",
                "A parking voucher",
                "A revised program",
                "A registration badge",
              ],
              correctIndex: 1,
              explanationZh:
                '结尾写道 "A parking voucher for the convention center garage is attached to this e-mail"，附件是停车券。胸牌需在会场大堂领取。',
            },
          ],
        },
        {
          id: "tm-rg2",
          passage: `MEMO

To: All Meridian Textiles staff
From: Alan Osei, Director of Information Technology
Date: March 3
Re: New expense-reporting system

Beginning April 1, the company will replace its current paper-based expense forms with SwiftClaim, an online reporting system. Employees will be able to photograph receipts with their phones and submit claims directly through the SwiftClaim mobile application. Reimbursements, which currently take up to four weeks, are expected to be processed within five business days.

To prepare for the transition, the IT department will hold three training sessions in the second-floor training room on March 18, 20, and 24. Each session lasts one hour and covers the same material, so staff need to attend only one. Please sign up on the intranet by March 14, as each session is limited to twenty-five participants.

Paper forms will still be accepted during April, but only claims submitted through SwiftClaim will be processed from May 1 onward. Questions about the new system should be directed to the IT help desk rather than to the finance office.`,
          questions: [
            {
              id: "tm-r-q05",
              stem: "What is the purpose of the memo?",
              options: [
                "To announce a change in reimbursement rates",
                "To ask staff to update their phone numbers",
                "To introduce a new expense-reporting system",
                "To describe changes to the finance office staff",
              ],
              correctIndex: 2,
              explanationZh:
                '备忘录首句即点明："the company will replace its current paper-based expense forms with SwiftClaim, an online reporting system"，目的是介绍新的报销系统。',
            },
            {
              id: "tm-r-q06",
              stem: "What advantage of SwiftClaim is mentioned?",
              options: [
                "Faster processing of reimbursements",
                "Lower monthly software costs",
                "Automatic currency conversion",
                "Access to previous years' claims",
              ],
              correctIndex: 0,
              explanationZh:
                '原文对比说现在报销 "take up to four weeks"，而新系统 "expected to be processed within five business days"，即报销速度大幅加快。',
            },
            {
              id: "tm-r-q07",
              stem: "What is indicated about the training sessions?",
              options: [
                "They are mandatory for all staff",
                "They take place in the finance office",
                "They each cover different material",
                "They are limited to twenty-five people each",
              ],
              correctIndex: 3,
              explanationZh:
                '备忘录要求在内网报名，"as each session is limited to twenty-five participants"，即每场限 25 人。三场内容相同，只需参加一场，并非强制全员参加。',
            },
            {
              id: "tm-r-q08",
              stem: "According to the memo, when will paper forms no longer be processed?",
              options: ["From April 1", "From May 1", "From March 24", "From March 14"],
              correctIndex: 1,
              explanationZh:
                '原文说四月仍接受纸质表格，"but only claims submitted through SwiftClaim will be processed from May 1 onward"，即 5 月 1 日起不再处理纸质报销。',
            },
          ],
        },
        {
          id: "tm-rg3",
          passage: `GREENFIELD WORKSPACES — Now Open in the Riverside District

Whether you are a freelancer who needs a quiet desk or a growing company looking for a private suite, Greenfield Workspaces has a plan for you. Our newly renovated five-story building at 400 Riverside Drive offers:

- Flexible hot desks from just $19 per day, with no monthly commitment
- Private offices for teams of two to twelve, available on six- or twelve-month leases
- Meeting rooms with video-conferencing equipment, bookable by the hour
- A rooftop lounge, secure bicycle storage, and free high-speed Internet on every floor

All members receive twenty-four-hour building access and two complimentary hours of meeting-room use each month. Sign up for a twelve-month private-office lease before June 30 and receive your first month free — just mention the code RIVER12 when you book a tour.

Tours are available Monday through Saturday, from 9 a.m. to 6 p.m. To schedule yours, call 555-0184 or visit www.greenfieldworkspaces.com. Free parking is available for all visitors during tours.`,
          questions: [
            {
              id: "tm-r-q09",
              stem: "What is being advertised?",
              options: [
                "A property-management seminar",
                "A shared office facility",
                "A building-renovation service",
                "A bicycle-rental company",
              ],
              correctIndex: 1,
              explanationZh:
                "广告开头面向自由职业者和成长中的公司，提供 hot desks、私人办公室和会议室，显然是共享办公空间（shared office facility）。",
            },
            {
              id: "tm-r-q10",
              stem: "What is indicated about the hot desks?",
              options: [
                "They include a private suite",
                "They must be reserved a month ahead",
                "They are located on the rooftop",
                "They require no monthly commitment",
              ],
              correctIndex: 3,
              explanationZh:
                '广告写明灵活工位 "from just $19 per day, with no monthly commitment"，即按天付费、无需按月签约。',
            },
            {
              id: "tm-r-q11",
              stem: "What do all members receive?",
              options: [
                "Around-the-clock building access",
                "Free parking for a year",
                "A twelve-month lease discount",
                "Unlimited meeting-room use",
              ],
              correctIndex: 0,
              explanationZh:
                '原文说 "All members receive twenty-four-hour building access"，即全天候进出大楼的权限；会议室每月仅赠送两小时，并非无限使用。',
            },
            {
              id: "tm-r-q12",
              stem: "How can a customer receive one month free?",
              options: [
                "By booking a meeting room online",
                "By referring another company",
                "By signing a twelve-month office lease before June 30",
                "By touring the building on a Saturday",
              ],
              correctIndex: 2,
              explanationZh:
                '优惠条件是 "Sign up for a twelve-month private-office lease before June 30 and receive your first month free"，即 6 月 30 日前签订十二个月私人办公室租约。',
            },
            {
              id: "tm-r-q13",
              stem: "According to the advertisement, how can readers schedule a tour?",
              options: [
                "By e-mailing the building manager",
                "By calling 555-0184",
                "By visiting the rooftop lounge",
                "By filling out a form at the reception desk",
              ],
              correctIndex: 1,
              explanationZh:
                '广告最后说 "To schedule yours, call 555-0184 or visit www.greenfieldworkspaces.com"，选项中只有拨打电话 555-0184 与原文一致。',
            },
          ],
        },
      ],
    },
  ],
};
