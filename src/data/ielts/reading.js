export const readingPassages = [
  {
    id: 1,
    title: 'The Impact of Urban Green Spaces',
    level: 'medium',
    passage: `Urban green spaces, including parks, gardens, and tree-lined streets, have long been recognized as vital components of city infrastructure. Beyond their aesthetic appeal, these spaces provide a multitude of benefits that extend to environmental, social, and economic domains.

Research conducted by the University of Exeter has demonstrated that individuals who spend at least two hours per week in natural environments report significantly higher levels of health and well-being compared to those who do not. This finding holds true across diverse demographic groups, regardless of age, gender, or socioeconomic status. The mental health benefits are particularly noteworthy, with studies showing reduced rates of depression and anxiety among populations with access to urban green spaces.

From an environmental perspective, urban vegetation plays a crucial role in mitigating the heat island effect — a phenomenon whereby cities experience markedly higher temperatures than surrounding rural areas. Trees and vegetation absorb solar radiation and provide shade, while also releasing water vapor through evapotranspiration, which cools the surrounding air. A study published in the journal Environmental Research Letters found that increasing urban tree cover by 20% could reduce peak summer temperatures by up to 2°C.

The economic benefits of urban green spaces are equally compelling. Properties located within 500 meters of a well-maintained park typically command 8-12% higher prices than comparable properties without nearby green space. Furthermore, commercial districts that incorporate trees and landscaping have been shown to attract more visitors and generate higher retail revenues. A comprehensive analysis by the Trust for Public Land estimated that for every dollar invested in urban parks, approximately four dollars in economic benefits are generated.

Despite these well-documented advantages, many cities continue to struggle with providing adequate green space for their residents. Rapid urbanization, competing land-use demands, and budget constraints often result in the prioritization of development over green infrastructure. However, innovative approaches such as vertical gardens, rooftop parks, and the conversion of abandoned industrial sites into community gardens are emerging as viable solutions to this growing challenge.`,
    questions: [
      {
        id: 'q1',
        type: 'matching',
        question: 'Match each benefit to the correct paragraph (A-D).',
        items: [
          'Higher property values near parks',
          'Reduced urban temperatures',
          'Improved mental health outcomes',
          'Increased retail activity in landscaped areas'
        ],
        answers: ['D', 'C', 'B', 'D'],
        explanation: 'Property values and retail revenues are discussed in paragraph D (economic benefits). Temperature reduction is in paragraph C (environmental). Mental health is in paragraph B (well-being research).'
      },
      {
        id: 'q2',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'The health benefits of green spaces vary significantly by age group.', answer: 'FALSE', explanation: 'The passage states benefits hold true "regardless of age, gender, or socioeconomic status."' },
          { text: 'Urban areas are typically cooler than surrounding rural regions.', answer: 'FALSE', explanation: 'The passage describes the heat island effect where cities experience "markedly higher temperatures" than rural areas.' },
          { text: 'Vertical gardens are one solution to the shortage of urban green space.', answer: 'TRUE', explanation: 'The passage mentions "vertical gardens, rooftop parks" as "viable solutions."' },
          { text: 'The University of Exeter study focused exclusively on children.', answer: 'NOT GIVEN', explanation: 'The passage mentions "diverse demographic groups" but does not specify children exclusively.' }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What phenomenon causes cities to be warmer than rural areas?', answer: 'heat island effect' },
          { question: 'How much could peak summer temperatures decrease with 20% more tree cover?', answer: 'up to 2°C' },
          { question: 'What is the estimated return on investment for urban parks?', answer: 'four dollars' }
        ]
      }
    ]
  },
  {
    id: 2,
    title: 'The Psychology of Decision-Making',
    level: 'hard',
    passage: `The study of human decision-making has undergone a remarkable transformation over the past four decades. Traditional economic theory, built on the assumption of rational actors who consistently maximize utility, has been progressively challenged by findings from behavioral economics and cognitive psychology. This paradigm shift has fundamentally altered our understanding of how people make choices in contexts ranging from consumer behavior to public policy.

Daniel Kahneman and Amos Tversky's groundbreaking work on prospect theory, published in 1979, demonstrated that individuals evaluate gains and losses asymmetrically. Specifically, the pain of losing a certain amount is psychologically approximately twice as powerful as the pleasure of gaining the same amount. This phenomenon, known as loss aversion, helps explain a wide range of seemingly irrational behaviors, from the reluctance to sell declining stocks to the tendency to hold onto possessions that are no longer needed.

The concept of cognitive biases has further expanded our understanding of decision-making limitations. The anchoring effect, for instance, shows that initial exposure to a number — even an arbitrary one — can significantly influence subsequent numerical estimates. In one famous experiment, participants were asked to estimate the percentage of African countries in the United Nations after spinning a rigged wheel. Those who landed on higher numbers gave substantially higher estimates, despite the obvious irrelevance of the wheel's outcome.

Another significant bias is the availability heuristic, whereby people assess the probability of events based on how easily examples come to mind. This explains why individuals often overestimate the likelihood of dramatic but rare events — such as plane crashes or shark attacks — while underestimating more common but less newsworthy risks. Media coverage amplifies this distortion, as vivid, emotionally charged stories are more memorable than statistical data.

The implications of these findings for public policy are profound. Richard Thaler and Cass Sunstein, in their influential book 'Nudge,' argue that understanding cognitive biases allows policymakers to design 'choice architectures' that guide people toward better decisions without restricting their freedom. Examples include automatically enrolling employees in retirement savings plans (while allowing opt-out) and placing healthier food options at eye level in cafeterias. These interventions, termed 'libertarian paternalism,' have been adopted by governments worldwide, with the UK's Behavioural Insights Team — popularly known as the 'Nudge Unit' — serving as a prominent model.`,
    questions: [
      {
        id: 'q1',
        type: 'matching-headings',
        question: 'Match each paragraph (A-E) with the most suitable heading.',
        headings: [
          'i. The power of first impressions',
          'ii. Overturning the rational model',
          'iii. Applying psychology to governance',
          'iv. The disproportionate weight of losses',
          'v. Judging probability by mental availability',
          'vi. The role of emotion in memory'
        ],
        answers: ['ii', 'iv', 'i', 'v', 'iii'],
        explanation: 'A introduces the challenge to rational theory. B discusses loss aversion. C covers anchoring (first impressions). D covers availability heuristic. E covers policy applications.'
      },
      {
        id: 'q2',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Kahneman and Tversky published their research on prospect theory in the 1980s.', answer: 'FALSE', explanation: 'The passage states it was published in 1979.' },
          { text: 'Loss aversion means people feel losses about twice as strongly as equivalent gains.', answer: 'TRUE', explanation: 'The passage states "the pain of losing... is psychologically approximately twice as powerful."' },
          { text: 'The Nudge Unit was originally established in the United States.', answer: 'FALSE', explanation: 'The passage states it is the "UK\'s Behavioural Insights Team."' },
          { text: 'The anchoring effect only works with numbers that are relevant to the estimation task.', answer: 'FALSE', explanation: 'The passage notes the wheel\'s outcome was "obviously irrelevant" yet still influenced estimates.' }
        ]
      },
      {
        id: 'q3',
        type: 'multiple-choice',
        question: 'Choose the correct letter, A, B, C, or D.',
        items: [
          {
            question: 'According to the passage, the availability heuristic causes people to:',
            options: [
              'A. prefer options that are easily available',
              'B. overestimate the probability of memorable events',
              'C. underestimate all types of risk equally',
              'D. rely on statistical data for decisions'
            ],
            answer: 'B',
            explanation: 'The passage states people "overestimate the likelihood of dramatic but rare events" based on how easily examples come to mind.'
          },
          {
            question: 'The concept of "libertarian paternalism" refers to:',
            options: [
              'A. restricting individual choices for the greater good',
              'B. using government regulations to control behavior',
              'C. guiding choices while preserving freedom to choose',
              'D. allowing the market to determine optimal outcomes'
            ],
            answer: 'C',
            explanation: 'The passage defines it as guiding "people toward better decisions without restricting their freedom."'
          }
        ]
      }
    ]
  },
  {
    id: 3,
    title: 'The History of Tea',
    level: 'easy',
    passage: `Tea is one of the most widely consumed beverages in the world, with a rich history spanning thousands of years. According to Chinese legend, tea was discovered in 2737 BCE by Emperor Shen Nung when leaves from a wild tea tree blew into his pot of boiling water. While this story is likely apocryphal, archaeological evidence suggests that tea consumption in China dates back at least 5,000 years.

Initially, tea was used primarily for medicinal purposes. The Chinese believed it aided digestion, improved concentration, and promoted longevity. During the Tang Dynasty (618-907 CE), tea drinking evolved from a medicinal practice into a social ritual. The scholar Lu Yu wrote 'The Classic of Tea' (Cha Jing) around 760 CE, which is considered the first known monograph on tea. This comprehensive work detailed the cultivation, processing, and preparation of tea, establishing standards that influenced tea culture for centuries.

Tea reached Japan in the early 9th century when Buddhist monks brought it back from China. The Japanese developed their own distinctive tea culture, culminating in the formal tea ceremony known as 'chanoyu' or 'sado.' This ritualized practice, deeply influenced by Zen Buddhism, emphasizes harmony, respect, purity, and tranquility. The Japanese tea ceremony remains an important cultural practice to this day.

The introduction of tea to Europe occurred in the 16th century through Portuguese and Dutch traders. However, it was the British who truly embraced tea as a national beverage. By the 18th century, tea had become Britain's most popular drink, leading to the establishment of the British East India Company's tea trade monopoly. The British appetite for tea had profound geopolitical consequences, including the Boston Tea Party of 1773, which became a catalyst for the American Revolution.

Today, global tea production exceeds 6 million metric tons annually, with China, India, and Kenya being the largest producers. The tea industry employs millions of workers worldwide and continues to evolve, with growing interest in specialty teas, organic production, and innovative tea-based beverages.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'The discovery of tea by Emperor Shen Nung is supported by archaeological evidence.', answer: 'NOT GIVEN', explanation: 'The passage says the legend is "likely apocryphal" but does not connect archaeological evidence specifically to the emperor.' },
          { text: 'Lu Yu\'s book was the first written work about tea in the world.', answer: 'TRUE', explanation: 'The passage describes it as "the first known monograph on tea."' },
          { text: 'The Dutch were the first Europeans to trade tea.', answer: 'FALSE', explanation: 'The passage mentions Portuguese and Dutch traders, with no clear indication the Dutch were first.' },
          { text: 'The Boston Tea Party directly caused the American Revolution.', answer: 'NOT GIVEN', explanation: 'The passage says it "became a catalyst" — not that it directly caused it.' }
        ]
      },
      {
        id: 'q2',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What are the four principles of the Japanese tea ceremony?', answer: 'harmony, respect, purity, tranquility' },
          { question: 'Which company controlled Britain\'s tea trade?', answer: 'British East India Company' },
          { question: 'Name the three largest tea-producing countries.', answer: 'China, India, Kenya' }
        ]
      },
      {
        id: 'q3',
        type: 'matching',
        question: 'Match each period to the correct event.',
        items: [
          '2737 BCE',
          '9th century',
          '18th century',
          '16th century'
        ],
        answers: ['Tea discovered by Chinese emperor', 'Tea introduced to Japan by monks', 'Tea became Britain\'s most popular drink', 'Tea first reached Europe'],
        explanation: '2737 BCE = emperor legend. 9th century = Japan monks. 18th century = British popularity. 16th century = European traders.'
      }
    ]
  }
]
