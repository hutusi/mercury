import type { ListeningExercise } from "../types";

export const toeicListening: ListeningExercise[] = [
  {
    id: "toeic-l-001",
    track: "toeic",
    title: "Finding a Room for the Client Presentation",
    titleZh: "为客户演示会另寻会议室",
    style: "对话 · Conversation",
    script: [
      {
        speaker: "A",
        text: "Hi Rachel, do you have a minute? I'm trying to finalize the room for Thursday's client presentation.",
      },
      {
        speaker: "B",
        text: "Sure, Marcus. I thought we'd already booked Conference Room A for two o'clock.",
      },
      {
        speaker: "A",
        text: "We had, but the facilities team just told me the projector in that room is being repaired. It won't be back until Friday.",
      },
      {
        speaker: "B",
        text: "That's a problem. The sales figures really need to be shown on a big screen.",
      },
      {
        speaker: "A",
        text: "Exactly. Room C is free at the same time, but it only seats eight, and we're expecting ten attendees.",
      },
      {
        speaker: "B",
        text: "What about the training room on the fifth floor? It holds twenty people and has a brand-new display.",
      },
      {
        speaker: "A",
        text: "Good idea. I'll check whether it's available. If it is, could you email the client the updated location?",
      },
      {
        speaker: "B",
        text: "Of course. I'll also print extra copies of the handouts in case anyone prefers paper.",
      },
      {
        speaker: "A",
        text: "Thanks. Oh, one more thing — could you ask Dana to join us? The client may have technical questions about the installation timeline.",
      },
      {
        speaker: "B",
        text: "She's out of the office this morning, but she'll be back after lunch. I'll ask her then.",
      },
      {
        speaker: "A",
        text: "Perfect. Let's meet at one thirty on Thursday to set everything up.",
      },
      {
        speaker: "B",
        text: "Sounds good. I'll send you a calendar invitation right away.",
      },
    ],
    questions: [
      {
        id: "q1",
        stem: "What problem does the man mention?",
        options: [
          "A client has cancelled a presentation",
          "A conference room has been double-booked",
          "A projector is unavailable until Friday",
          "The sales figures contain errors",
        ],
        correctIndex: 2,
        explanationZh:
          '男士说 "the projector in that room is being repaired. It won\'t be back until Friday"——A 会议室的投影仪送修，周五才能修好，所以周四不能用。选项 B 有迷惑性：房间本身订到了，问题出在设备而不是重复预订。',
      },
      {
        id: "q2",
        stem: "What does the woman suggest?",
        options: [
          "Using the training room on the fifth floor",
          "Moving the presentation to Friday",
          "Reducing the number of attendees to eight",
          "Presenting the figures without a screen",
        ],
        correctIndex: 0,
        explanationZh:
          '女士提议 "What about the training room on the fifth floor? It holds twenty people and has a brand-new display"。“八人”是 C 会议室的容量限制，正是放弃该房间的原因，不是解决方案（排除 C）。',
      },
      {
        id: "q3",
        stem: "Why does the man want Dana to attend the presentation?",
        options: [
          "To print extra copies of the handouts",
          "To answer possible technical questions from the client",
          "To operate the new display",
          "To take notes during the meeting",
        ],
        correctIndex: 1,
        explanationZh:
          '男士解释请 Dana 参加的原因："The client may have technical questions about the installation timeline"，即客户可能会问安装时间表方面的技术问题。打印讲义是女士主动提出自己来做的事，用作干扰项。',
      },
      {
        id: "q4",
        stem: "What will the woman most likely do next?",
        options: [
          "Speak to Dana in her office",
          "Check the availability of the training room",
          "Call the facilities team",
          "Send the man a calendar invitation",
        ],
        correctIndex: 3,
        explanationZh:
          '对话最后女士说 "I\'ll send you a calendar invitation right away"，right away 表明这是她接下来立刻要做的事。查训练室是否可用的人是男士（"I\'ll check whether it\'s available"）；找 Dana 要等到午饭后，都不是“接下来”的动作。',
      },
    ],
  },
  {
    id: "toeic-l-002",
    track: "toeic",
    title: "Gate Change Announcement at the Airport",
    titleZh: "机场登机口变更广播",
    style: "独白 · Talk",
    script: [
      {
        speaker: "narrator",
        text: "Good afternoon, passengers. This is an announcement for Skyway Airlines Flight 274 to Vancouver.",
      },
      {
        speaker: "narrator",
        text: "Due to a mechanical inspection of the original aircraft, this flight will now depart from Gate 32 instead of Gate 18.",
      },
      {
        speaker: "narrator",
        text: "Gate 32 is located in Terminal B, about a ten-minute walk from this area. Please follow the signs for Gates 30 through 40.",
      },
      {
        speaker: "narrator",
        text: "The departure time has also been revised. Boarding will now begin at four fifteen, one hour later than originally scheduled.",
      },
      {
        speaker: "narrator",
        text: "We apologize for the inconvenience. As a gesture of goodwill, meal vouchers are available at the Skyway Airlines service desk next to Gate 18.",
      },
      {
        speaker: "narrator",
        text: "The vouchers can be used at any restaurant or cafe inside the terminal.",
      },
      {
        speaker: "narrator",
        text: "Passengers with connecting flights in Vancouver should speak to a member of staff at the service desk. Our agents will rebook any connections affected by the delay.",
      },
      {
        speaker: "narrator",
        text: "Please have your boarding pass and passport ready when boarding begins.",
      },
      {
        speaker: "narrator",
        text: "Once again, Flight 274 to Vancouver will now board at Gate 32 at four fifteen. Thank you for your patience, and we wish you a pleasant journey.",
      },
    ],
    questions: [
      {
        id: "q1",
        stem: "Where is this announcement most likely being made?",
        options: [
          "On board an aircraft",
          "At an airport",
          "At a travel agency",
          "At a train station",
        ],
        correctIndex: 1,
        explanationZh:
          "广播中出现 flight、gate、boarding pass、terminal 等一系列机场专用词汇，且面向的是等待登机的乘客，故场景是机场。注意不是机上广播——广播指引乘客步行前往另一个登机口，说明人还在航站楼内（排除 A）。",
      },
      {
        id: "q2",
        stem: "Why has the departure gate been changed?",
        options: [
          "Gate 18 is being renovated",
          "The flight crew arrived late",
          "Bad weather has closed part of the terminal",
          "The original aircraft needs a mechanical inspection",
        ],
        correctIndex: 3,
        explanationZh:
          '广播明确说明原因："Due to a mechanical inspection of the original aircraft, this flight will now depart from Gate 32"，即原飞机需要机械检查。其余选项都是常见的延误原因，但均未在广播中提及。',
      },
      {
        id: "q3",
        stem: "What are passengers offered because of the delay?",
        options: [
          "Meal vouchers",
          "A seat upgrade",
          "A discount on their next flight",
          "Free access to the airport lounge",
        ],
        correctIndex: 0,
        explanationZh:
          '广播提到 "meal vouchers are available at the Skyway Airlines service desk"，作为补偿向乘客发放餐券，可在航站楼内任何餐厅或咖啡店使用。其他三项补偿方式都没有出现。',
      },
      {
        id: "q4",
        stem: "What should passengers with connecting flights do?",
        options: [
          "Proceed directly to Gate 32",
          "Call Skyway Airlines customer service",
          "Speak to staff at the service desk",
          "Wait for a further announcement",
        ],
        correctIndex: 2,
        explanationZh:
          '广播指示转机乘客 "should speak to a member of staff at the service desk"，工作人员会为受延误影响的衔接航班重新订票。直接去 32 号登机口是对普通乘客的指引，对转机乘客而言少了改签这一步（排除 A）。',
      },
    ],
  },
];
