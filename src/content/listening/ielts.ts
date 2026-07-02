import type { ListeningExercise } from "../types";

export const ieltsListening: ListeningExercise[] = [
  {
    id: "ielts-l-001",
    track: "ielts",
    title: "Enquiring About a Room at Rosewood House",
    titleZh: "咨询 Rosewood House 的房间租赁",
    style: "对话 · Dialogue",
    script: [
      {
        speaker: "A",
        text: "Good morning, Rosewood House student accommodation. How can I help you?",
      },
      {
        speaker: "B",
        text: "Oh, hello. I'm starting a master's course in September, and I saw your advertisement online. Do you still have rooms available?",
      },
      {
        speaker: "A",
        text: "We do. We have two types left: a standard room with a shared bathroom, and an en-suite room with its own bathroom.",
      },
      {
        speaker: "B",
        text: "What's the difference in price?",
      },
      {
        speaker: "A",
        text: "The standard room is one hundred and forty pounds a week, and the en-suite is one hundred and eighty-five. Both prices include electricity, heating, and internet.",
      },
      {
        speaker: "B",
        text: "That's good to know. Is there a kitchen?",
      },
      {
        speaker: "A",
        text: "Yes, each floor has a shared kitchen with a fridge, an oven, and a microwave. You'd just need to bring your own pots and pans.",
      },
      {
        speaker: "B",
        text: "I see. And how far is the building from the university?",
      },
      {
        speaker: "A",
        text: "It's about a fifteen-minute walk to the main campus, or five minutes by bicycle. There's a secure bike shed behind the building.",
      },
      {
        speaker: "B",
        text: "Great. If I decide to take the en-suite, what do I need to do?",
      },
      {
        speaker: "A",
        text: "You'd pay a deposit of two hundred and fifty pounds to hold the room, and we'd need a copy of your university offer letter. The deposit is refundable when you move out, as long as there's no damage.",
      },
      {
        speaker: "B",
        text: "Understood. Could I come and see the room first? I'll be in the city next week.",
      },
      {
        speaker: "A",
        text: "Of course. We run viewings every Wednesday and Saturday at two p.m. Just bring some photo identification, like a passport.",
      },
      {
        speaker: "B",
        text: "Perfect, I'll come on Wednesday then. Thank you very much for your help.",
      },
    ],
    questions: [
      {
        id: "q1",
        stem: "Why is the woman calling Rosewood House?",
        options: [
          "To ask about renting a room for her studies",
          "To report a problem with her current room",
          "To cancel a booking she made online",
          "To ask for directions to the university",
        ],
        correctIndex: 0,
        explanationZh:
          "女士开头说明来意：\"I'm starting a master's course in September... Do you still have rooms available?\"——她九月开始读硕士，想租学生公寓的房间。后面问到去大学的距离只是了解房源情况的细节问题（排除 D）。",
      },
      {
        id: "q2",
        stem: "How much does the en-suite room cost per week?",
        options: [
          "One hundred and forty pounds",
          "Two hundred and fifty pounds",
          "One hundred and eighty-five pounds",
          "One hundred and fifteen pounds",
        ],
        correctIndex: 2,
        explanationZh:
          '接待员报价："the en-suite is one hundred and eighty-five"，即带独立卫浴的房间每周 185 英镑。140 英镑是标准间的价格，250 英镑是押金——IELTS Section 1 常用多个数字互相干扰，要听清每个数字对应的对象。',
      },
      {
        id: "q3",
        stem: "What is included in the weekly rent?",
        options: [
          "Pots and pans for the kitchen",
          "A weekly cleaning service",
          "Bicycle rental",
          "Electricity, heating, and internet",
        ],
        correctIndex: 3,
        explanationZh:
          '原文说 "Both prices include electricity, heating, and internet"，两种房型的租金都包含水电暖网。锅具需要自备（"You\'d just need to bring your own pots and pans"），选项 A 正好说反。',
      },
      {
        id: "q4",
        stem: "What must the woman provide to reserve the room?",
        options: [
          "A reference letter from her employer",
          "A deposit and a copy of her university offer letter",
          "Three months' rent in advance",
          "Proof of her home address",
        ],
        correctIndex: 1,
        explanationZh:
          "接待员说明预订手续：\"You'd pay a deposit of two hundred and fifty pounds... and we'd need a copy of your university offer letter\"，即 250 英镑押金加大学录取通知书复印件。护照是看房时要带的身份证件，与预订手续无关。",
      },
      {
        id: "q5",
        stem: "When will the woman most likely visit Rosewood House?",
        options: [
          "On Saturday at two p.m.",
          "In September, when her course begins",
          "On Wednesday at two p.m.",
          "Next Monday morning",
        ],
        correctIndex: 2,
        explanationZh:
          '看房时间为每周三和周六下午两点，女士最后确认："Perfect, I\'ll come on Wednesday then"，所以她会在周三下午两点去看房。周六也是可选时间但她没有选（排除 A）；九月是开学时间，不是看房时间。',
      },
    ],
  },
  {
    id: "ielts-l-002",
    track: "ielts",
    title: "Welcome Tour of the New Campus Sports Centre",
    titleZh: "校园新体育中心导览介绍",
    style: "独白 · Monologue",
    script: [
      {
        speaker: "narrator",
        text: "Good morning, everyone, and welcome to this short introduction to the university's new sports centre. My name is Karen, and I'm the facilities coordinator here.",
      },
      {
        speaker: "narrator",
        text: "The centre opened just last month, and as you can see, it replaces the old gymnasium, which had served the university for over forty years.",
      },
      {
        speaker: "narrator",
        text: "On the ground floor, we have a twenty-five-metre swimming pool and a fitness suite with more than eighty exercise machines. The pool is the only part of the building that closes early, at eight p.m., because of lifeguard requirements.",
      },
      {
        speaker: "narrator",
        text: "The rest of the centre is open from six in the morning until ten at night, seven days a week, including public holidays.",
      },
      {
        speaker: "narrator",
        text: "Upstairs, on the first floor, you'll find four badminton courts, two squash courts, and a large studio used for yoga and dance classes.",
      },
      {
        speaker: "narrator",
        text: "Now, about membership. All full-time students pay a reduced annual fee of ninety pounds, which is less than half the price for members of the public, who pay two hundred pounds.",
      },
      {
        speaker: "narrator",
        text: "Your membership card gives you free access to the pool and the fitness suite at any time. However, the squash and badminton courts must be booked in advance, either online or at the reception desk, and bookings open forty-eight hours ahead.",
      },
      {
        speaker: "narrator",
        text: "One more thing: the yoga and dance classes are extremely popular, so I'd recommend signing up at the start of each term rather than waiting.",
      },
      {
        speaker: "narrator",
        text: "Right, that's the end of my introduction. If you'd like to follow me, we'll start the tour at the swimming pool, and I'll be happy to answer questions as we walk.",
      },
    ],
    questions: [
      {
        id: "q1",
        stem: "What is the main purpose of the talk?",
        options: [
          "To explain the history of the old gymnasium",
          "To announce changes to class timetables",
          "To recruit lifeguards for the swimming pool",
          "To introduce the facilities and rules of a new sports centre",
        ],
        correctIndex: 3,
        explanationZh:
          "说话人是设施协调员，依次介绍了新体育中心的各层设施、开放时间、会员费和预订规则，属于典型的 Section 2 场馆介绍。旧体育馆只在开头一句带过，不是主要内容（排除 A）。",
      },
      {
        id: "q2",
        stem: "Why does the swimming pool close earlier than the rest of the centre?",
        options: [
          "It needs to be cleaned every evening",
          "Because of lifeguard requirements",
          "Fewer people swim in the evening",
          "It is still being renovated",
        ],
        correctIndex: 1,
        explanationZh:
          '原文说泳池八点关闭是 "because of lifeguard requirements"，即出于救生员值守方面的规定。其余选项都是听起来合理的常识性猜测，但讲话中并未提及——IELTS 听力要求以原文为准。',
      },
      {
        id: "q3",
        stem: "How much do full-time students pay for annual membership?",
        options: [
          "Ninety pounds",
          "Two hundred pounds",
          "Forty-eight pounds",
          "One hundred pounds",
        ],
        correctIndex: 0,
        explanationZh:
          '讲话人说："All full-time students pay a reduced annual fee of ninety pounds"，学生年费为 90 英镑。200 英镑是校外公众的价格；48 出现在“提前 48 小时开放预订”中，是数字干扰项。',
      },
      {
        id: "q4",
        stem: "What must members do before using the squash courts?",
        options: [
          "Pay an additional fee at reception",
          "Attend a short safety briefing",
          "Book the court in advance",
          "Bring their own equipment",
        ],
        correctIndex: 2,
        explanationZh:
          '原文规定 "the squash and badminton courts must be booked in advance, either online or at the reception desk"——壁球场和羽毛球场必须提前预订，线上或前台皆可。会员卡对泳池和健身房是随时免费使用，与球场规则不同。',
      },
      {
        id: "q5",
        stem: "What does the speaker recommend about yoga and dance classes?",
        options: [
          "Trying a free class before joining",
          "Signing up early in the term",
          "Booking forty-eight hours in advance",
          "Attending on public holidays when it is quieter",
        ],
        correctIndex: 1,
        explanationZh:
          '讲话人建议："I\'d recommend signing up at the start of each term rather than waiting"，因为瑜伽和舞蹈课非常热门。选项 C 的“提前 48 小时”是球场预订规则，不适用于课程报名，属于移花接木的干扰项。',
      },
    ],
  },
];
