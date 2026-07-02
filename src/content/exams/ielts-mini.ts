import type { MockExam } from "../types";

export const ieltsMiniExam: MockExam = {
  id: "exam-ielts-mini",
  track: "ielts",
  title: "Mini IELTS Mock Exam",
  titleZh: "迷你雅思全真模考",
  descriptionZh:
    "共 23 题：听力 10 题（场景对话 + 独白各 5 题）+ 阅读 13 题（两篇学术短文），约 25 分钟完成。",
  sections: [
    {
      id: "ielts-mini-listening",
      kind: "listening",
      title: "Listening",
      titleZh: "听力部分",
      durationSeconds: 600,
      groups: [
        {
          id: "im-lg1",
          script: [
            {
              speaker: "A",
              text: "Good morning, Riverside Community Centre. How can I help you?",
            },
            {
              speaker: "B",
              text: "Oh, hello. I'd like to ask about hiring a room for a training day my company is running next month.",
            },
            {
              speaker: "A",
              text: "Certainly. We have two options: the Main Hall, which holds up to eighty people, and the Garden Room, which takes twenty-five.",
            },
            {
              speaker: "B",
              text: "There'll only be about eighteen of us, so the Garden Room sounds right. How much does it cost?",
            },
            {
              speaker: "A",
              text: "It's forty-five pounds an hour on weekdays, but if you book a full day — that's nine to five — the rate drops to three hundred pounds.",
            },
            {
              speaker: "B",
              text: "We'd need the whole day, so I'll take the full-day rate. Does that include any equipment?",
            },
            {
              speaker: "A",
              text: "A projector and a whiteboard are included. If you want the video-conferencing kit, that's an extra twenty pounds.",
            },
            {
              speaker: "B",
              text: "We won't need that. But could we have tea and coffee provided during the day?",
            },
            {
              speaker: "A",
              text: "Of course. Catering is three pounds fifty per person for unlimited hot drinks and biscuits.",
            },
            {
              speaker: "B",
              text: "Great, please add that for eighteen people. The date we want is Tuesday the fourteenth of May.",
            },
            {
              speaker: "A",
              text: "Let me check... yes, the Garden Room is free that day. Can I take your name and a contact number?",
            },
            {
              speaker: "B",
              text: "It's Marcus Webb — that's W-E-B-B — and my mobile is oh seven seven oh two, double five, eight one six three.",
            },
          ],
          questions: [
            {
              id: "im-l-q01",
              stem: "Why is the man calling the community centre?",
              options: [
                "To cancel a room booking",
                "To ask about a job at the centre",
                "To hire a room for a training day",
                "To book tickets for an event",
              ],
              correctIndex: 2,
              explanationZh:
                "男士开头就说明来意：\"I'd like to ask about hiring a room for a training day my company is running next month\"，即为公司培训日租用场地。",
            },
            {
              id: "im-l-q02",
              stem: "Which room does the man choose, and why?",
              options: [
                "The Garden Room, because his group is small",
                "The Main Hall, because it holds eighty people",
                "The Garden Room, because it is cheaper per hour",
                "The Main Hall, because it has a projector",
              ],
              correctIndex: 0,
              explanationZh:
                "男士说 \"There'll only be about eighteen of us, so the Garden Room sounds right\"——因为只有约 18 人，所以选择可容纳 25 人的花园厅。",
            },
            {
              id: "im-l-q03",
              stem: "How much will the man pay for the room itself?",
              options: ["£45", "£20", "£63", "£300"],
              correctIndex: 3,
              explanationZh:
                "接待员说预订全天 \"the rate drops to three hundred pounds\"，男士回答 \"I'll take the full-day rate\"，因此房费为 300 英镑。45 英镑是每小时价格，20 英镑是视频会议设备费。",
            },
            {
              id: "im-l-q04",
              stem: "What does the man ask to be provided?",
              options: [
                "Video-conferencing equipment",
                "Tea, coffee and biscuits",
                "An extra whiteboard",
                "A vegetarian lunch",
              ],
              correctIndex: 1,
              explanationZh:
                "男士明确拒绝了视频会议设备（\"We won't need that\"），随后询问 \"could we have tea and coffee provided\"，并为 18 人预订了含热饮和饼干的餐饮服务。",
            },
            {
              id: "im-l-q05",
              stem: "What is the caller's surname?",
              options: ["Webb", "Webber", "Wade", "Weeks"],
              correctIndex: 0,
              explanationZh:
                "男士报出姓名并拼写：\"It's Marcus Webb — that's W-E-B-B\"，因此姓氏是 Webb。注意听拼读是雅思 Section 1 的常见考点。",
            },
          ],
        },
        {
          id: "im-lg2",
          script: [
            {
              speaker: "narrator",
              text: "Good morning everyone, and welcome to your volunteer briefing for this year's Harbourside Food Festival.",
            },
            {
              speaker: "narrator",
              text: "The festival runs for three days, from Friday the second of June to Sunday the fourth, and we're expecting around twenty thousand visitors in total.",
            },
            {
              speaker: "narrator",
              text: "Most of you will be working at the information tent, which this year has moved from the harbour entrance to the square outside the town library.",
            },
            {
              speaker: "narrator",
              text: "We moved it because last year visitors arriving by bus simply couldn't find it — the new spot is directly opposite the bus station.",
            },
            {
              speaker: "narrator",
              text: "Volunteers on the morning shift should arrive at eight thirty, half an hour before the gates open, and collect a radio from the site office.",
            },
            {
              speaker: "narrator",
              text: "Your green festival T-shirt and identity badge will be handed out at the same time — please return the radio at the end of each shift, but the T-shirt is yours to keep.",
            },
            {
              speaker: "narrator",
              text: "Free lunch vouchers can be used at any food stall except the seafood grill, which is run by an outside company.",
            },
            {
              speaker: "narrator",
              text: "If a visitor loses a personal item, don't try to deal with it yourself — send them to the first-aid cabin, which doubles as the lost-property point.",
            },
            {
              speaker: "narrator",
              text: "Finally, there's a short training video to watch in the site office before your first shift, and after that, if you have any questions, just ask your team leader.",
            },
          ],
          questions: [
            {
              id: "im-l-q06",
              stem: "Where will the information tent be located this year?",
              options: [
                "At the harbour entrance",
                "Inside the town library",
                "Next to the seafood grill",
                "In the square opposite the bus station",
              ],
              correctIndex: 3,
              explanationZh:
                "讲话人说信息帐篷 \"has moved from the harbour entrance to the square outside the town library\"，并补充新位置 \"directly opposite the bus station\"。海港入口是去年的旧址。",
            },
            {
              id: "im-l-q07",
              stem: "What time should morning-shift volunteers arrive?",
              options: ["9:00", "8:30", "8:00", "9:30"],
              correctIndex: 1,
              explanationZh:
                "原文说早班志愿者 \"should arrive at eight thirty, half an hour before the gates open\"，即 8:30 到岗，9:00 才开门。",
            },
            {
              id: "im-l-q08",
              stem: "What must volunteers return at the end of each shift?",
              options: [
                "Their identity badge",
                "Their festival T-shirt",
                "Their radio",
                "Their lunch vouchers",
              ],
              correctIndex: 2,
              explanationZh:
                "讲话人明确区分：\"please return the radio at the end of each shift, but the T-shirt is yours to keep\"——对讲机须归还，T 恤可以留下。",
            },
            {
              id: "im-l-q09",
              stem: "Where should visitors go if they lose a personal item?",
              options: [
                "The first-aid cabin",
                "The site office",
                "The information tent",
                "The bus station",
              ],
              correctIndex: 0,
              explanationZh:
                "原文说遇到失物应 \"send them to the first-aid cabin, which doubles as the lost-property point\"，即急救小屋兼作失物招领处。",
            },
            {
              id: "im-l-q10",
              stem: "What should volunteers do before their first shift?",
              options: [
                "Meet their team leader at the gates",
                "Collect a lunch voucher",
                "Watch a training video",
                "Visit the seafood grill",
              ],
              correctIndex: 2,
              explanationZh:
                "结尾提到 \"there's a short training video to watch in the site office before your first shift\"，即首个班次前须在现场办公室观看培训视频。",
            },
          ],
        },
      ],
    },
    {
      id: "ielts-mini-reading",
      kind: "reading",
      title: "Reading",
      titleZh: "阅读部分",
      durationSeconds: 900,
      groups: [
        {
          id: "im-rg1",
          passage: `The Promise of Vertical Farming

As the world's urban population continues to grow, researchers have begun to question whether conventional agriculture can feed tomorrow's cities. One proposed solution is vertical farming: the practice of growing crops in stacked layers inside buildings, using artificial light and carefully controlled temperature, humidity and nutrients.

Advocates point to several advantages. Because the growing environment is sealed, vertical farms use up to 95 per cent less water than open fields, since the moisture that plants release is captured and recycled rather than lost to the air. Crops can be harvested all year round, unaffected by drought, frost or storms, and because the farms can be built inside cities, lettuce or herbs may travel only a few kilometres to reach the consumer instead of crossing continents. Pesticides, which outdoor farmers need in order to combat insects, become largely unnecessary indoors.

Yet the technology has one significant weakness: energy. Sunlight is free, but the LED lamps that replace it are not, and lighting typically accounts for more than half of a vertical farm's operating costs. For this reason, most commercial operations focus on fast-growing, high-value crops such as salad leaves and herbs; staple crops like wheat and rice, which need months of light to mature, remain far too expensive to grow indoors.

The economics may nonetheless be shifting. The price of LED lighting fell by roughly 85 per cent between 2010 and 2020, and some operators now sign long-term contracts for renewable electricity to stabilise their costs. Analysts increasingly suggest that the industry's future lies not in replacing conventional farms but in complementing them: producing perishable greens close to city consumers while land-hungry staples continue to be grown in the countryside. Whether vertical farming becomes a lasting feature of the urban food system will probably depend less on horticultural ingenuity than on the price of electricity.`,
          questions: [
            {
              id: "im-r-q01",
              stem: "According to the passage, why do vertical farms use far less water than open fields?",
              options: [
                "They grow crops that need little moisture",
                "Moisture released by plants is captured and reused",
                "They rely on rainwater collected from rooftops",
                "Their crops mature more quickly",
              ],
              correctIndex: 1,
              explanationZh:
                "第二段解释：由于种植环境封闭，\"the moisture that plants release is captured and recycled rather than lost to the air\"，植物释放的水分被回收再利用，因此节水可达 95%。",
            },
            {
              id: "im-r-q02",
              stem: "The writer mentions lettuce and herbs in the second paragraph as examples of produce that",
              options: [
                "requires heavy use of pesticides",
                "is difficult to grow indoors",
                "is often wasted during transport",
                "can be grown close to consumers",
              ],
              correctIndex: 3,
              explanationZh:
                "原文说农场可建在城市内，\"lettuce or herbs may travel only a few kilometres to reach the consumer instead of crossing continents\"，举例说明产品可以就近供应消费者。",
            },
            {
              id: "im-r-q03",
              stem: "What does the writer identify as vertical farming's main weakness?",
              options: [
                "The cost of artificial lighting",
                "The shortage of urban building space",
                "The difficulty of controlling humidity",
                "The lack of consumer demand",
              ],
              correctIndex: 0,
              explanationZh:
                "第三段指出 \"the technology has one significant weakness: energy\"，并说明照明 \"accounts for more than half of a vertical farm's operating costs\"，即人工照明成本是最大短板。",
            },
            {
              id: "im-r-q04",
              stem: "Why do most commercial vertical farms avoid staple crops such as wheat and rice?",
              options: [
                "These crops sell at too low a price outdoors",
                "These crops cannot be grown in stacked layers",
                "These crops need months of costly lighting to mature",
                "These crops require pesticides indoors",
              ],
              correctIndex: 2,
              explanationZh:
                "原文说小麦和水稻 \"need months of light to mature, remain far too expensive to grow indoors\"——生长周期长、耗电多，室内种植成本过高。",
            },
            {
              id: "im-r-q05",
              stem: "What development does the writer say may be changing the economics of vertical farming?",
              options: [
                "Government subsidies for urban agriculture",
                "A sharp fall in the price of LED lighting",
                "Rising global demand for salad leaves",
                "New varieties of fast-growing wheat",
              ],
              correctIndex: 1,
              explanationZh:
                "最后一段提到 \"The price of LED lighting fell by roughly 85 per cent between 2010 and 2020\"，LED 价格大幅下降正在改变行业的经济性。",
            },
            {
              id: "im-r-q06",
              stem: "What is the writer's overall conclusion about vertical farming?",
              options: [
                "It will soon replace conventional agriculture",
                "It is unlikely to succeed in any form",
                "It depends mainly on horticultural ingenuity",
                "It will most likely complement conventional farming",
              ],
              correctIndex: 3,
              explanationZh:
                "结尾指出行业的未来 \"lies not in replacing conventional farms but in complementing them\"——在城市生产易腐蔬菜，主粮仍在农村种植，即与传统农业互补而非取代。",
            },
          ],
        },
        {
          id: "im-rg2",
          passage: `Rethinking the Open-Plan Office

For much of the twentieth century, the private office was a symbol of professional status. From the 1960s onwards, however, companies began tearing down interior walls, persuaded that open-plan layouts would cut property costs and, more importantly, encourage the spontaneous conversations from which new ideas were believed to emerge.

The cost savings were real, but the collaborative benefits have proved much harder to demonstrate. In an influential 2018 study, researchers at Harvard equipped employees at two large firms with sociometric badges — wearable sensors that record face-to-face conversation — before and after their employers switched to open-plan layouts. Contrary to expectations, face-to-face interaction fell by roughly 70 per cent after the walls came down, while electronic messaging rose sharply. The researchers concluded that workers, stripped of privacy, withdrew socially and used e-mail to reach even colleagues seated a few desks away, in search of the privacy the office no longer provided.

Noise appears to be a central problem. Overheard speech is far more distracting than steady background sound because the human brain automatically tries to follow it, whether the listener wants to or not. Surveys consistently find that "irrelevant speech" is the complaint most strongly associated with dissatisfaction in open offices, and laboratory experiments link it to measurable declines in memory and proofreading accuracy.

Employers have responded not by rebuilding walls but by diversifying space. In so-called activity-based working, employees have no fixed desk; instead, they choose among quiet zones, phone booths, project rooms and social areas according to the task at hand. Early studies suggest that satisfaction rises where such choice is genuine, but falls where quiet spaces are too few for those who need them. The lesson of half a century of office design may be that no single layout suits every kind of work: what employees appear to need most is not openness, but control over their own environment.`,
          questions: [
            {
              id: "im-r-q07",
              stem: "According to the passage, why did companies originally adopt open-plan layouts?",
              options: [
                "To cut costs and encourage spontaneous conversation",
                "To follow the example of Harvard researchers",
                "To reduce noise levels in the workplace",
                "To give employees control over their environment",
              ],
              correctIndex: 0,
              explanationZh:
                "第一段说公司拆除隔墙是因为相信开放式布局能 \"cut property costs and... encourage the spontaneous conversations from which new ideas were believed to emerge\"，即省钱并促进自发交流。",
            },
            {
              id: "im-r-q08",
              stem: "What did the 2018 Harvard study find?",
              options: [
                "Employees held more face-to-face meetings",
                "Electronic messaging declined sharply",
                "Face-to-face interaction fell by about 70 per cent",
                "Sociometric badges were unreliable",
              ],
              correctIndex: 2,
              explanationZh:
                "研究结果与预期相反：\"face-to-face interaction fell by roughly 70 per cent after the walls came down, while electronic messaging rose sharply\"——面对面交流大减，电子沟通激增。",
            },
            {
              id: "im-r-q09",
              stem: "The researchers concluded that employees used e-mail more because they",
              options: [
                "wanted a written record of decisions",
                "were seeking the privacy they had lost",
                "sat too far away from their colleagues",
                "were instructed to do so by employers",
              ],
              correctIndex: 1,
              explanationZh:
                "原文说员工 \"stripped of privacy, withdrew socially and used e-mail... in search of the privacy the office no longer provided\"，即用电子邮件寻回失去的私密空间。",
            },
            {
              id: "im-r-q10",
              stem: "Why is overheard speech especially distracting, according to the passage?",
              options: [
                "The brain automatically tries to follow it",
                "It is louder than other office sounds",
                "It usually concerns personal gossip",
                "It interrupts electronic messaging",
              ],
              correctIndex: 0,
              explanationZh:
                "第三段解释：\"the human brain automatically tries to follow it, whether the listener wants to or not\"——大脑会不由自主地追踪听到的谈话内容，因此比稳定的背景噪音更让人分心。",
            },
            {
              id: "im-r-q11",
              stem: "In activity-based working, employees",
              options: [
                "are permanently assigned to a quiet zone",
                "work mainly from home",
                "keep a fixed desk in a project room",
                "choose a workspace to match their current task",
              ],
              correctIndex: 3,
              explanationZh:
                "第四段说这种模式下 \"employees have no fixed desk; instead, they choose among quiet zones, phone booths, project rooms and social areas according to the task at hand\"，即按任务选择工作区域。",
            },
            {
              id: "im-r-q12",
              stem: "According to early studies, when does satisfaction with activity-based working fall?",
              options: [
                "When social areas are removed",
                "When desks are placed too close together",
                "When quiet spaces are too few",
                "When phone booths are overused",
              ],
              correctIndex: 2,
              explanationZh:
                "原文说满意度在选择真实存在时上升，\"but falls where quiet spaces are too few for those who need them\"——安静空间不足时满意度下降。",
            },
            {
              id: "im-r-q13",
              stem: "What conclusion does the writer draw about office design?",
              options: [
                "Open layouts suit most kinds of work",
                "Workers chiefly need control over their environment",
                "Private offices should be fully restored",
                "Noise problems cannot be solved",
              ],
              correctIndex: 1,
              explanationZh:
                "结尾总结：没有一种布局适合所有工作，\"what employees appear to need most is not openness, but control over their own environment\"——员工最需要的是对自身环境的掌控权。",
            },
          ],
        },
      ],
    },
  ],
};
