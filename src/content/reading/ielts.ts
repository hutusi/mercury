import type { ReadingExercise } from "../types";

export const ieltsReading: ReadingExercise[] = [
  {
    id: "ielts-r-001",
    track: "ielts",
    title: "The Quiet Work of Urban Green Spaces",
    titleZh: "城市绿地的无声贡献",
    genre: "Academic",
    passage: `More than half of the world's population now lives in cities, and the proportion continues to rise. For much of the twentieth century, urban parks, street trees, and community gardens were treated primarily as decoration — pleasant to look at, but peripheral to the serious business of housing, transport, and commerce. A growing body of research suggests that this view badly underestimates what green spaces actually do for cities and their residents.

The health evidence is perhaps the most striking. Numerous studies have linked proximity to green space with lower stress levels, reduced rates of obesity, and better cardiovascular outcomes. One influential Danish study, which tracked nearly one million residents over several decades, found that children who grew up surrounded by vegetation had a significantly lower risk of developing psychiatric disorders in adulthood, even after the researchers adjusted for family income and history of mental illness. The mechanisms are still debated, but candidate explanations include cleaner air, more opportunities for physical activity, and the restorative effect that natural settings appear to have on attention.

Green spaces also perform measurable environmental work. Cities are typically several degrees warmer than the surrounding countryside — the so-called urban heat island effect — because concrete and asphalt absorb and store solar radiation. Trees counteract this in two ways: their canopies block sunlight from reaching hard surfaces, and their leaves release water vapour through evapotranspiration, which cools the surrounding air much as perspiration cools the human body. Parks can be two to four degrees cooler than nearby built-up districts, and vegetated ground absorbs stormwater that would otherwise overwhelm drainage systems.

Yet the benefits of greenery are not evenly shared. Wealthier neighbourhoods tend to have more trees and better-maintained parks, and ambitious new projects can trigger what critics call green gentrification: an attractive park raises nearby property values, and rising rents gradually displace the very residents the project was intended to serve. Partly for this reason, some planners now favour many small, modest pocket parks distributed across a city over a single flagship development.`,
    suggestedMinutes: 10,
    questions: [
      {
        id: "q1",
        stem: "What is the main idea of the passage?",
        options: [
          "Urban parks are too expensive for most cities to maintain properly",
          "Cities should replace flagship parks with community gardens",
          "Green spaces provide substantial health and environmental benefits, though their distribution raises concerns",
          "The urban heat island effect is the most serious problem facing modern cities",
        ],
        correctIndex: 2,
        explanationZh:
          "文章先指出绿地长期被视为“装饰”，随后用两段分别论证其健康效益和环境效益，最后一段讨论分配不均与“绿色士绅化”问题，因此 C 最全面地概括了主旨。选项 D 只对应第三段的一个细节，属于以偏概全。",
      },
      {
        id: "q2",
        stem: "What did the Danish study mentioned in paragraph 2 find?",
        options: [
          "Cleaner air was the main cause of better mental health in cities",
          "Children raised near vegetation were less likely to develop psychiatric disorders later in life",
          "Family income had no effect on children's health outcomes",
          "Adults who moved to green neighbourhoods recovered faster from stress",
        ],
        correctIndex: 1,
        explanationZh:
          "原文写道，该研究发现 \"children who grew up surrounded by vegetation had a significantly lower risk of developing psychiatric disorders in adulthood\"。选项 A 有迷惑性：cleaner air 只是文中列举的候选解释之一，且原文明确说机制 \"are still debated\"（尚有争议），并未确认主因。",
      },
      {
        id: "q3",
        stem: "According to the passage, one way trees cool a city is by",
        options: [
          "releasing water vapour from their leaves",
          "absorbing solar radiation into their trunks",
          "reflecting sunlight back into the atmosphere",
          "channelling stormwater into drainage systems",
        ],
        correctIndex: 0,
        explanationZh:
          "第三段指出树木降温的两种方式：树冠遮挡阳光，以及 \"their leaves release water vapour through evapotranspiration\"（叶片通过蒸腾作用释放水汽）。“吸收太阳辐射”是混凝土和沥青致热的原因，方向正好相反；雨水吸收是绿地的另一功能，与降温无关。",
      },
      {
        id: "q4",
        stem: "The word \"displace\" in the final paragraph is closest in meaning to",
        options: [
          "disappoint",
          "impoverish",
          "replace with newcomers",
          "force to move away",
        ],
        correctIndex: 3,
        explanationZh:
          "displace 在此指“迫使（原居民）迁离”：新公园推高房价和租金，原本应受益的居民反而被迫搬走。选项 C 描述的是结果之一（新住户迁入），但 displace 本身强调的是“被迫离开”这一动作。",
      },
      {
        id: "q5",
        stem: "Why do some planners now prefer pocket parks, according to the passage?",
        options: [
          "They cost less to build than large parks",
          "They spread the benefits of greenery while limiting gentrification pressure",
          "They are more effective at absorbing stormwater",
          "They attract more visitors than flagship developments",
        ],
        correctIndex: 1,
        explanationZh:
          "最后一段用 \"Partly for this reason\" 衔接：正因为大型旗舰项目容易引发绿色士绅化，规划者才转向分散在全城的小型口袋公园，让效益更均匀且不至于大幅推高某一片区的房价。文中并未比较建造成本或访客数量，A、D 属于无中生有。",
      },
    ],
  },
  {
    id: "ielts-r-002",
    track: "ielts",
    title: "The Open-Plan Office Paradox",
    titleZh: "开放式办公室的悖论",
    genre: "Academic",
    passage: `Few features of the modern workplace have been adopted as enthusiastically, or questioned as persistently, as the open-plan office. By removing walls and private rooms, employers hoped to encourage spontaneous conversation, speed up decision-making, and foster a culture of transparency — all while housing more employees in less space. Today, a large majority of office workers in North America and Europe sit in some form of open layout. The assumption underlying this design is intuitive: if people can see each other, they will talk to each other.

A well-known study by Ethan Bernstein and Stephen Turban, published in 2018, put this assumption to an unusually rigorous test. Rather than asking employees how they communicated, the researchers equipped staff at two multinational companies with wearable sensors that recorded face-to-face interaction before and after their offices were converted to open plans. The results were the opposite of what the designs promised: face-to-face interaction fell by roughly seventy per cent, while email and instant messaging rose sharply. Stripped of privacy, employees appeared to withdraw, protecting their concentration behind headphones and screens rather than engaging with the colleagues now visible all around them.

Psychologists offer several explanations for this retreat. Constant background noise makes complex work more effortful, and the sense of being observed — what researchers call the audience effect — discourages the informal, half-formed conversations in which new ideas often begin. Signalling unavailability becomes a survival skill: wearing headphones in an open office is now widely understood to mean do not disturb.

Importantly, the research does not amount to a call for a return to private offices. Bernstein himself argues that the lesson is subtler: organisations should measure how employees actually behave rather than assume that a fashionable layout will produce the intended behaviour. Many firms are now experimenting with activity-based working, in which staff move between quiet zones, collaboration areas, and meeting rooms depending on the task at hand — an acknowledgement that no single environment suits every kind of work.`,
    suggestedMinutes: 10,
    questions: [
      {
        id: "q1",
        stem: "What is the passage mainly about?",
        options: [
          "The history of office architecture in North America and Europe",
          "Why companies should return to private offices",
          "Techniques employees use to avoid distraction at work",
          "Evidence that open-plan offices can reduce the interaction they were meant to promote",
        ],
        correctIndex: 3,
        explanationZh:
          "全文围绕一个悖论展开：开放式办公室本为促进交流而设计，但 Bernstein 与 Turban 的研究发现面对面交流反而减少约七成。选项 B 与末段直接矛盾——作者明确说这项研究 \"does not amount to a call for a return to private offices\"。",
      },
      {
        id: "q2",
        stem: "How did Bernstein and Turban collect their data?",
        options: [
          "By recording interactions with wearable sensors",
          "By interviewing employees about their communication habits",
          "By comparing productivity figures at two companies",
          "By analysing the content of employees' emails",
        ],
        correctIndex: 0,
        explanationZh:
          "原文强调研究方法的严谨之处正在于 \"Rather than asking employees how they communicated, the researchers equipped staff... with wearable sensors\"——不是靠访谈（排除 B），而是用可穿戴传感器客观记录面对面交流。文中提到邮件数量上升，但并未分析邮件内容（排除 D）。",
      },
      {
        id: "q3",
        stem: "According to the study, what happened after the offices became open plan?",
        options: [
          "Decision-making became noticeably faster",
          "Electronic communication increased sharply",
          "Employees held more informal conversations",
          "Staff spent less time wearing headphones",
        ],
        correctIndex: 1,
        explanationZh:
          "研究结果是面对面交流下降约 70%，而 \"email and instant messaging rose sharply\"，即电子沟通大幅增加。选项 A 是开放式布局的设计初衷而非实际结果；C、D 与文中描述的“戴上耳机、回避交谈”正好相反。",
      },
      {
        id: "q4",
        stem: "The word \"withdraw\" in paragraph 2 is closest in meaning to",
        options: [
          "resign from their positions",
          "remove their belongings",
          "retreat from social contact",
          "take back their complaints",
        ],
        correctIndex: 2,
        explanationZh:
          "withdraw 在此指员工在失去隐私后“退缩、回避社交接触”，后文 \"protecting their concentration behind headphones and screens\" 是对这种退缩的具体描写。选项 A 利用了 withdraw 可以表示“退出（职位）”的另一义项，但语境不符。",
      },
      {
        id: "q5",
        stem: "What lesson does Bernstein draw from the research, according to the final paragraph?",
        options: [
          "Quiet zones are more productive than collaboration areas",
          "Fashionable office designs always fail in practice",
          "Companies should let employees work from home instead",
          "Organisations should observe actual behaviour rather than assume a layout will work as intended",
        ],
        correctIndex: 3,
        explanationZh:
          "末段直接引述 Bernstein 的观点：\"organisations should measure how employees actually behave rather than assume that a fashionable layout will produce the intended behaviour\"。选项 B 过于绝对——作者并未说时髦设计“总是”失败；文中根本没有讨论居家办公（排除 C）。",
      },
    ],
  },
];
