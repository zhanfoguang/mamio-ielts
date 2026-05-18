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
  },
  {
    id: 4,
    title: 'The Future of Space Exploration',
    level: 'medium',
    passage: `Space exploration has entered a transformative new era, driven by a combination of government ambition, private enterprise, and rapid technological advancement. Whereas the Apollo missions of the 1960s and 1970s represented the pinnacle of state-sponsored space travel, the current landscape is increasingly shaped by commercial companies such as SpaceX, Blue Origin, and Rocket Lab. These organisations have dramatically reduced the cost of reaching orbit through innovations like reusable rocket boosters, making space more accessible than at any point in history.

One of the most significant goals of contemporary space exploration is the establishment of a permanent human presence on Mars. NASA's Artemis programme, which aims to return astronauts to the Moon as a stepping stone, is central to this vision. The Moon is seen as a testing ground for the technologies and life-support systems that will be required for the far longer journey to Mars, which takes approximately seven months with current propulsion methods. Scientists are developing advanced life-support systems capable of recycling air and water, as well as investigating the feasibility of growing food in extraterrestrial soil.

The role of robotic missions should not be underestimated. Unmanned probes and rovers continue to provide invaluable scientific data at a fraction of the cost of crewed missions. NASA's Perseverance rover, which landed on Mars in 2021, has been collecting rock samples and searching for signs of ancient microbial life. Meanwhile, the James Webb Space Telescope, launched in the same year, has revolutionised our understanding of distant galaxies and exoplanets, detecting atmospheric compositions that could indicate habitable conditions beyond our solar system.

However, the expansion of space activity raises important questions about governance and sustainability. The growing accumulation of orbital debris poses a serious threat to satellites and crewed spacecraft. Furthermore, the 1967 Outer Space Treaty, which forms the basis of international space law, was drafted long before commercial space travel was conceivable and may need updating to address issues such as resource extraction on the Moon and asteroid mining.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Reusable rocket technology has lowered the cost of reaching orbit.', answer: 'TRUE', explanation: 'The passage states these companies "dramatically reduced the cost of reaching orbit through innovations like reusable rocket boosters."' },
          { text: 'A journey to Mars currently takes approximately three months.', answer: 'FALSE', explanation: 'The passage states the journey "takes approximately seven months with current propulsion methods."' },
          { text: 'The Perseverance rover has found definitive evidence of microbial life on Mars.', answer: 'FALSE', explanation: 'The passage says the rover has been "searching for signs" of ancient microbial life, not that it has found definitive evidence.' },
          { text: 'The James Webb Space Telescope was launched before the Perseverance rover.', answer: 'NOT GIVEN', explanation: 'Both are said to have been relevant "in the same year" (2021), but their exact launch sequence is not specified.' }
        ]
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Choose the correct letter, A, B, C, or D.',
        items: [
          {
            question: 'According to the passage, the Moon is important for Mars exploration because:',
            options: [
              'A. it contains resources that can be used for the Mars journey',
              'B. it serves as a location to test technologies needed for Mars',
              'C. it has similar atmospheric conditions to Mars',
              'D. it is the closest point for launching Mars missions'
            ],
            answer: 'B',
            explanation: 'The passage describes the Moon as "a testing ground for the technologies and life-support systems" needed for Mars.'
          },
          {
            question: 'The passage suggests the 1967 Outer Space Treaty:',
            options: [
              'A. has been effective in preventing all conflicts in space',
              'B. should be abandoned entirely',
              'C. may need revision to address modern commercial activities',
              'D. already covers asteroid mining regulations'
            ],
            answer: 'C',
            explanation: 'The passage states it "may need updating to address issues such as resource extraction on the Moon and asteroid mining."'
          }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What programme does NASA plan to use to return astronauts to the Moon?', answer: 'Artemis programme' },
          { question: 'What poses a growing threat to satellites and spacecraft?', answer: 'orbital debris' },
          { question: 'What year did the Perseverance rover land on Mars?', answer: '2021' }
        ]
      }
    ]
  },
  {
    id: 5,
    title: 'Language Acquisition in Children',
    level: 'easy',
    passage: `The process by which children learn to speak and understand language is one of the most remarkable feats of human development. From the moment they are born, infants begin absorbing the linguistic sounds of their environment. By the age of six months, babies can typically distinguish between phonemes — the smallest units of sound — from any language in the world. However, by ten to twelve months, this ability narrows to the phonemes of their native language, a process known as perceptual narrowing.

Children generally begin producing their first recognizable words at around twelve months of age. This milestone marks the transition from babbling to meaningful speech. Initially, a child's vocabulary grows slowly, perhaps acquiring only a few new words each week. However, between the ages of 18 and 24 months, most children experience what researchers call a "vocabulary explosion," during which they may learn ten or more new words per day. By the age of six, the average child has a vocabulary of approximately 10,000 words.

Grammar development follows a predictable pattern as well. Around the age of two, children begin combining words into simple two-word phrases such as "more milk" or "daddy go." By age three, most children can construct simple sentences, though they frequently make errors such as overgeneralising grammatical rules. A classic example is a child saying "goed" instead of "went" or "mouses" instead of "mice." These errors actually demonstrate that children are actively learning and applying grammatical rules rather than simply memorising phrases.

The debate over how children acquire language has persisted for decades. The linguist Noam Chomsky argued that humans are born with an innate "language acquisition device" — a mental module specifically designed for learning language. In contrast, behaviourist theories, associated with B.F. Skinner, proposed that language is learned entirely through imitation and reinforcement. Most contemporary researchers adopt an interactionist position, acknowledging that while biological predispositions play a crucial role, social interaction and environmental input are equally essential for language development.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Babies can distinguish between phonemes of all languages at six months old.', answer: 'TRUE', explanation: 'The passage states that at six months, babies "can typically distinguish between phonemes... from any language in the world."' },
          { text: 'The vocabulary explosion occurs before the age of 18 months.', answer: 'FALSE', explanation: 'The passage states it occurs "between the ages of 18 and 24 months."' },
          { text: 'Grammatical errors in children indicate they have not yet learned any rules.', answer: 'FALSE', explanation: 'The passage states these errors "demonstrate that children are actively learning and applying grammatical rules."' },
          { text: 'Chomsky believed language is learned through social reinforcement.', answer: 'FALSE', explanation: 'Chomsky argued for an innate "language acquisition device." Social reinforcement is attributed to Skinner.' }
        ]
      },
      {
        id: 'q2',
        type: 'matching',
        question: 'Match each age or stage to the correct description.',
        items: [
          '6 months',
          '12 months',
          '18-24 months',
          '6 years'
        ],
        answers: ['Distinguish all phonemes globally', 'First recognizable words produced', 'Vocabulary explosion occurs', 'Vocabulary reaches approximately 10,000 words'],
        explanation: '6 months = all phonemes. 12 months = first words. 18-24 months = vocabulary explosion. 6 years = 10,000-word vocabulary.'
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What is the term for the narrowing of phoneme recognition to one language?', answer: 'perceptual narrowing' },
          { question: 'What did Chomsky call the innate mental module for language?', answer: 'language acquisition device' },
          { question: 'What position do most modern researchers take on language acquisition?', answer: 'interactionist position' }
        ]
      }
    ]
  },
  {
    id: 6,
    title: 'The Economics of Renewable Energy',
    level: 'hard',
    passage: `The global energy landscape is undergoing a profound structural transformation as renewable energy sources become increasingly cost-competitive with fossil fuels. According to the International Renewable Energy Agency (IRENA), the global weighted-average cost of electricity from solar photovoltaic (PV) systems fell by 85% between 2010 and 2022, while onshore wind costs declined by 56% over the same period. These dramatic reductions have been driven by economies of scale in manufacturing, improvements in panel and turbine efficiency, and favourable government policies such as feed-in tariffs and tax credits.

The concept of the "levelised cost of energy" (LCOE) provides a standardised metric for comparing the lifetime costs of different electricity generation technologies. LCOE accounts for capital expenditure, operating costs, fuel costs, and the expected output of a power plant over its lifetime. As of 2023, new solar and onshore wind installations in many regions have a lower LCOE than new coal or natural gas plants, even without subsidies. This crossover point — where renewables become cheaper than fossil fuels on a purely economic basis — represents a fundamental tipping point in energy markets.

However, the intermittency of solar and wind power presents significant challenges for grid management. Unlike conventional power plants that can generate electricity on demand, renewable sources depend on weather conditions and time of day. Energy storage technologies, particularly lithium-ion batteries, are critical to addressing this limitation. The cost of lithium-ion battery packs has fallen by approximately 97% since 1991, making large-scale storage increasingly viable. Nevertheless, current battery technology can typically provide only four to six hours of storage, which may be insufficient during extended periods of low wind or cloud cover.

The economic implications of the energy transition extend well beyond the power sector. Employment in renewable energy reached 13.7 million jobs globally in 2022, according to IRENA, with solar photovoltaic alone accounting for 4.9 million positions. However, this transition also creates significant challenges for communities and regions dependent on fossil fuel extraction. Coal-producing regions in countries such as Australia, India, and the United States face potential economic disruption, necessitating proactive "just transition" policies that include retraining programmes, economic diversification initiatives, and targeted social support.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Solar PV electricity costs decreased by more than 80% between 2010 and 2022.', answer: 'TRUE', explanation: 'The passage states costs "fell by 85% between 2010 and 2022."' },
          { text: 'LCOE includes only the capital cost of building a power plant.', answer: 'FALSE', explanation: 'LCOE "accounts for capital expenditure, operating costs, fuel costs, and expected output" over the plant lifetime.' },
          { text: 'Lithium-ion battery costs have decreased by approximately 50% since 1991.', answer: 'FALSE', explanation: 'The passage states costs "fell by approximately 97% since 1991."' },
          { text: 'Solar PV created more renewable energy jobs than any other technology in 2022.', answer: 'NOT GIVEN', explanation: 'Solar PV accounts for 4.9 million of 13.7 million total, but the passage does not compare it explicitly to all other technologies.' }
        ]
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Choose the correct letter, A, B, C, or D.',
        items: [
          {
            question: 'The passage defines the "tipping point" in energy markets as the moment when:',
            options: [
              'A. governments stop subsidising fossil fuels',
              'B. renewable energy becomes cheaper than fossil fuels without subsidies',
              'C. all countries adopt renewable energy targets',
              'D. battery storage can power cities overnight'
            ],
            answer: 'B',
            explanation: 'The passage describes the "crossover point — where renewables become cheaper than fossil fuels on a purely economic basis."' },
          {
            question: 'According to the passage, the main limitation of current battery storage is:',
            options: [
              'A. the high cost of lithium-ion batteries',
              'B. the inability to store solar energy',
              'C. limited duration of storage capacity',
              'D. insufficient manufacturing capacity'
            ],
            answer: 'C',
            explanation: 'The passage states current battery technology "can typically provide only four to six hours of storage."'
          }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What metric standardises the comparison of electricity generation costs?', answer: 'levelised cost of energy' },
          { question: 'How many renewable energy jobs existed globally in 2022?', answer: '13.7 million' },
          { question: 'What term describes policies supporting fossil fuel communities through transition?', answer: 'just transition' }
        ]
      }
    ]
  },
  {
    id: 7,
    title: 'Artificial Intelligence in Healthcare',
    level: 'medium',
    passage: `Artificial intelligence is rapidly reshaping the healthcare industry, offering the potential to improve diagnostic accuracy, streamline administrative processes, and accelerate drug development. Machine learning algorithms, which can identify patterns in vast datasets far more quickly than human analysts, are at the forefront of this transformation. One of the most promising applications is in medical imaging, where AI systems have demonstrated the ability to detect conditions such as diabetic retinopathy, lung cancer, and breast cancer with accuracy comparable to — and in some cases exceeding — that of experienced radiologists.

A landmark study published in Nature Medicine in 2020 described an AI system developed by Google Health that outperformed human radiologists in detecting breast cancer from mammograms. The system reduced false positives by 5.7% and false negatives by 9.4% in a study involving nearly 29,000 women. Such improvements, even if seemingly modest in percentage terms, could translate into thousands of earlier diagnoses and saved lives when applied at population scale.

Beyond diagnostics, AI is being used to personalise treatment plans for patients. By analysing a patient's genetic profile, medical history, and lifestyle factors, AI algorithms can recommend tailored therapies that are more likely to be effective and less likely to cause adverse reactions. This approach, known as precision medicine, represents a shift away from the traditional "one-size-fits-all" model of healthcare. In oncology, for example, AI tools can analyse tumour genetics to predict which chemotherapy regimens will be most effective for individual patients.

Despite its promise, the integration of AI into healthcare raises significant ethical and practical concerns. Algorithmic bias is a major issue: if training data disproportionately represents certain demographic groups, AI systems may perform less accurately for underrepresented populations, potentially exacerbating existing health disparities. Additionally, the "black box" nature of many AI models — where even developers cannot fully explain how a system arrives at its conclusions — poses challenges for clinical accountability and patient trust. Regulatory frameworks are still evolving to address these issues, with bodies such as the U.S. Food and Drug Administration developing new pathways for evaluating AI-based medical devices.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'AI diagnostic accuracy in medical imaging has matched or surpassed that of experienced radiologists.', answer: 'TRUE', explanation: 'The passage states AI systems detect conditions "with accuracy comparable to — and in some cases exceeding — that of experienced radiologists."' },
          { text: 'The Google Health study involved over 50,000 women.', answer: 'FALSE', explanation: 'The passage states the study involved "nearly 29,000 women."' },
          { text: 'Precision medicine tailors treatment based on individual patient characteristics.', answer: 'TRUE', explanation: 'The passage describes precision medicine as recommending "tailored therapies" based on genetic profile, medical history, and lifestyle.' },
          { text: 'The FDA has already established comprehensive regulations for all AI medical devices.', answer: 'FALSE', explanation: 'The passage states regulatory bodies are "developing new pathways," implying regulations are not yet comprehensive.' }
        ]
      },
      {
        id: 'q2',
        type: 'matching',
        question: 'Match each concept to the correct description.',
        items: [
          'Machine learning',
          'Precision medicine',
          'Algorithmic bias',
          'Black box models'
        ],
        answers: ['Identifies patterns in large datasets quickly', 'Tailors treatments to individual patient profiles', 'Results from unrepresentative training data', 'Systems whose decision processes cannot be fully explained'],
        explanation: 'Machine learning = pattern identification. Precision medicine = tailored treatments. Algorithmic bias = unrepresentative data. Black box = unexplainable decisions.'
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'By how much did the AI system reduce false positives in the breast cancer study?', answer: '5.7%' },
          { question: 'What shift does precision medicine represent away from in healthcare?', answer: 'one-size-fits-all' },
          { question: 'Which organisation is developing new evaluation pathways for AI medical devices?', answer: 'Food and Drug Administration' }
        ]
      }
    ]
  },
  {
    id: 8,
    title: 'The History of Written Communication',
    level: 'easy',
    passage: `The invention of writing is widely regarded as one of the most transformative developments in human history. Before writing systems emerged, all knowledge was transmitted orally, making it vulnerable to loss and distortion over generations. The earliest known writing system, cuneiform, developed in Mesopotamia around 3400 BCE. The Sumerians used a reed stylus to press wedge-shaped marks into soft clay tablets, initially to record agricultural transactions and trade. Over time, cuneiform evolved to express complex literary, legal, and scientific ideas, giving rise to some of the world's earliest known works of literature, including the Epic of Gilgamesh.

Around the same period, the ancient Egyptians developed a distinct writing system known as hieroglyphics. Unlike cuneiform, which was primarily used on clay, hieroglyphics were carved into stone monuments and painted on the walls of tombs and temples. Egyptian writing served both practical and ceremonial purposes: administrative records were kept on papyrus scrolls, while elaborate hieroglyphic inscriptions celebrated the achievements of pharaohs and communicated religious beliefs. The discovery of the Rosetta Stone in 1799, which contained the same text in hieroglyphics, Demotic script, and Greek, finally enabled scholars to decipher Egyptian hieroglyphics in the early 19th century.

The development of the alphabet represented another major milestone. The Phoenicians, a seafaring trading civilisation based in the eastern Mediterranean, are credited with creating the first widely adopted alphabet around 1050 BCE. Unlike earlier writing systems that used hundreds or even thousands of symbols, the Phoenician alphabet consisted of only 22 consonant letters, making it far simpler to learn and use. The Greeks later adapted the Phoenician alphabet by adding vowels, and the Romans further refined it into the Latin alphabet that is now the most widely used writing system in the world.

The invention of the printing press by Johannes Gutenberg around 1440 revolutionised written communication once again. Before the press, books were copied by hand, making them expensive and accessible only to the wealthy and clergy. Gutenberg's movable-type press made it possible to produce books quickly and cheaply, leading to a dramatic increase in literacy rates across Europe. Within fifty years of its invention, an estimated 20 million volumes had been printed, laying the groundwork for the spread of knowledge that would fuel the Renaissance and the Scientific Revolution.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Cuneiform was initially developed to record religious texts.', answer: 'FALSE', explanation: 'The passage states cuneiform was used "initially to record agricultural transactions and trade."' },
          { text: 'The Rosetta Stone contained text in three different scripts.', answer: 'TRUE', explanation: 'The passage states it "contained the same text in hieroglyphics, Demotic script, and Greek."' },
          { text: 'The Phoenician alphabet included vowel letters.', answer: 'FALSE', explanation: 'The passage states "the Greeks later adapted the Phoenician alphabet by adding vowels," implying the original had none.' },
          { text: 'Gutenberg invented the printing press in the 15th century.', answer: 'TRUE', explanation: 'The passage states it was invented "around 1440," which is the 15th century.' }
        ]
      },
      {
        id: 'q2',
        type: 'matching',
        question: 'Match each writing system to its origin or key characteristic.',
        items: [
          'Cuneiform',
          'Hieroglyphics',
          'Phoenician alphabet',
          'Latin alphabet'
        ],
        answers: ['Mesopotamia, wedge-shaped marks on clay', 'Egypt, carved into stone and painted on walls', '22 consonant letters, created around 1050 BCE', 'Refined by Romans, most widely used today'],
        explanation: 'Cuneiform = Mesopotamia/clay. Hieroglyphics = Egypt/stone. Phoenician = 22 consonants. Latin = Romans/most widespread.'
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What material did the Egyptians use for administrative records?', answer: 'papyrus scrolls' },
          { question: 'What is considered the earliest known work of literature?', answer: 'Epic of Gilgamesh' },
          { question: 'How many volumes were printed within fifty years of the printing press?', answer: '20 million volumes' }
        ]
      }
    ]
  },
  {
    id: 9,
    title: 'Climate Change and Ocean Currents',
    level: 'hard',
    passage: `The world's oceans play a critical role in regulating the Earth's climate, absorbing approximately 90% of the excess heat generated by greenhouse gas emissions and acting as a vast carbon sink. Central to this regulatory function are ocean currents — continuous, directed movements of seawater driven by differences in temperature, salinity, and wind patterns. The most significant of these circulation systems is the Atlantic Meridional Overturning Circulation (AMOC), which transports warm surface water from the tropics toward the North Atlantic, where it cools, becomes denser, and sinks to the deep ocean before flowing southward.

Recent research has raised alarming concerns about the stability of the AMOC. A study published in Nature Climate Change in 2023 concluded that the AMOC has weakened by approximately 15% since the mid-20th century, primarily due to increased freshwater input from the melting Greenland ice sheet. Freshwater reduces the salinity and density of surface water, inhibiting the sinking process that drives the circulation. Climate models suggest that continued warming could push the AMOC past a critical tipping point, potentially leading to a dramatic slowdown or even a complete shutdown within this century.

The consequences of a significant AMOC disruption would be far-reaching. Europe, which currently enjoys a relatively mild climate for its latitude due to the warming influence of the North Atlantic Current, could experience substantially colder winters. Precipitation patterns across the tropics would shift, potentially devastating agricultural systems in West Africa and South America that depend on consistent rainfall. Sea levels along the eastern coast of North America could rise more rapidly as the compensating force of the northward current diminishes.

It is important to note, however, that considerable uncertainty remains in climate models regarding the timing and probability of an AMOC collapse. While some models project a shutdown as early as 2050 under high-emission scenarios, others suggest the system is more resilient than previously thought. The Intergovernmental Panel on Climate Change (IPCC) has stated with medium confidence that a full AMOC collapse before 2100 is unlikely but cannot be ruled out. Continued monitoring through networks such as the RAPID array, which has measured AMOC strength at 26.5 degrees north latitude since 2004, is essential for reducing this uncertainty.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'The oceans absorb about 90% of excess heat from greenhouse gas emissions.', answer: 'TRUE', explanation: 'The passage states oceans absorb "approximately 90% of the excess heat generated by greenhouse gas emissions."' },
          { text: 'The AMOC has weakened by approximately 30% since the mid-20th century.', answer: 'FALSE', explanation: 'The passage states it has weakened "by approximately 15%."' },
          { text: 'All climate models agree the AMOC will shut down before 2050.', answer: 'FALSE', explanation: 'The passage states "some models project a shutdown as early as 2050... others suggest the system is more resilient."' },
          { text: 'The RAPID monitoring array has been operational since 2004.', answer: 'TRUE', explanation: 'The passage states it "has measured AMOC strength... since 2004."' }
        ]
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Choose the correct letter, A, B, C, or D.',
        items: [
          {
            question: 'According to the passage, the AMOC is primarily driven by:',
            options: [
              'A. wind patterns over the Atlantic Ocean',
              'B. differences in water temperature and salinity',
              'C. tidal forces from the Moon',
              'D. volcanic activity on the ocean floor'
            ],
            answer: 'B',
            explanation: 'The passage states ocean currents are "driven by differences in temperature, salinity, and wind patterns," and the AMOC involves water that "cools, becomes denser, and sinks."' },
          {
            question: 'What would be a likely consequence of an AMOC shutdown for North America?',
            options: [
              'A. lower sea levels on the east coast',
              'B. more consistent rainfall in agricultural regions',
              'C. faster sea-level rise along the eastern coast',
              'D. warmer winters in Europe'
            ],
            answer: 'C',
            explanation: 'The passage states "sea levels along the eastern coast of North America could rise more rapidly."'
          }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What ice sheet is contributing freshwater that weakens the AMOC?', answer: 'Greenland ice sheet' },
          { question: 'At what latitude does the RAPID array measure the AMOC?', answer: '26.5 degrees north' },
          { question: 'What confidence level did the IPCC assign to its AMOC collapse assessment?', answer: 'medium confidence' }
        ]
      }
    ]
  },
  {
    id: 10,
    title: 'The Psychology of Consumer Behavior',
    level: 'medium',
    passage: `Understanding why consumers make the purchasing decisions they do has been a central concern of marketers and psychologists for over a century. Early models of consumer behaviour assumed that individuals were rational agents who carefully weighed the costs and benefits of each purchase. However, decades of research have revealed that purchasing decisions are heavily influenced by psychological, social, and emotional factors that often operate below the level of conscious awareness.

One of the most well-established findings in consumer psychology is the power of social proof — the tendency for people to look to the behaviour of others when making decisions. This principle explains why product reviews, testimonials, and "bestseller" lists are such effective marketing tools. A classic experiment by researchers at Columbia University demonstrated that people were significantly more likely to choose a restaurant that had a long queue outside than one that was empty, even when both offered identical menus. In the digital age, social proof has become even more pervasive, with online ratings, influencer endorsements, and user-generated content shaping consumer preferences on a massive scale.

The concept of anchoring also plays a significant role in how consumers perceive price and value. Retailers frequently exploit this bias by displaying a high "original" price next to a discounted sale price, making the reduction appear more substantial. Research has shown that even when consumers are aware that the original price may be inflated, the anchor still influences their perception of the deal's attractiveness. Similarly, the strategy of offering three pricing tiers — a basic, mid-range, and premium option — takes advantage of the "decoy effect," whereby the presence of an asymmetrically dominated option makes the mid-range choice seem like the best value.

Emotion is another powerful driver of consumer behaviour. Studies in neuromarketing have shown that purchasing decisions activate brain regions associated with reward and pleasure, rather than those involved in analytical reasoning. Brands that create strong emotional associations — through storytelling, imagery, or shared values — tend to enjoy greater customer loyalty and willingness to pay premium prices. The success of brands like Apple and Nike illustrates how emotional branding can transform functional products into aspirational lifestyle symbols, creating communities of consumers who identify strongly with the brand's identity.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Early models of consumer behaviour assumed people made irrational purchasing decisions.', answer: 'FALSE', explanation: 'The passage states early models "assumed that individuals were rational agents."' },
          { text: 'In the Columbia University experiment, people preferred the busier restaurant even though both had the same food.', answer: 'TRUE', explanation: 'The passage states people were "significantly more likely to choose a restaurant that had a long queue... even when both offered identical menus."' },
          { text: 'Consumers are immune to anchoring effects when they know about them.', answer: 'FALSE', explanation: 'The passage states "even when consumers are aware... the anchor still influences their perception."' },
          { text: 'Neuromarketing studies show that purchasing decisions involve the brain\'s analytical reasoning centres.', answer: 'FALSE', explanation: 'The passage states purchasing decisions "activate brain regions associated with reward and pleasure, rather than those involved in analytical reasoning."' }
        ]
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Choose the correct letter, A, B, C, or D.',
        items: [
          {
            question: 'The "decoy effect" in pricing strategy works by:',
            options: [
              'A. offering the cheapest option to attract customers',
              'B. making all options appear equally valuable',
              'C. adding an inferior option to make the mid-range choice more appealing',
              'D. removing the premium option to simplify decisions'
            ],
            answer: 'C',
            explanation: 'The passage describes it as "an asymmetrically dominated option" that "makes the mid-range choice seem like the best value."' },
          {
            question: 'According to the passage, emotional branding helps companies by:',
            options: [
              'A. reducing the cost of advertising',
              'B. increasing customer loyalty and willingness to pay more',
              'C. eliminating the need for product quality',
              'D. making consumers more rational in their choices'
            ],
            answer: 'B',
            explanation: 'The passage states emotional associations lead to "greater customer loyalty and willingness to pay premium prices."'
          }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What principle explains why people follow others\' purchasing behaviour?', answer: 'social proof' },
          { question: 'What strategy uses three pricing levels to guide consumer choice?', answer: 'decoy effect' },
          { question: 'What field studies the brain\'s response to marketing stimuli?', answer: 'neuromarketing' }
        ]
      }
    ]
  },
  {
    id: 11,
    title: 'The Rise of Vertical Farming',
    level: 'medium',
    passage: `Vertical farming is an agricultural method in which crops are grown in stacked layers inside controlled indoor environments. Instead of relying on soil and natural rainfall, many vertical farms use hydroponic or aeroponic systems that deliver nutrients directly to plant roots. Artificial lighting, humidity control, and automated monitoring allow growers to produce leafy vegetables throughout the year, even in dense urban areas where farmland is scarce.

Supporters argue that vertical farming can reduce several environmental costs associated with conventional agriculture. Because water is recirculated, some systems use up to 90% less water than field-based farming. Indoor production can also reduce the need for pesticides, since crops are protected from many insects and diseases. Furthermore, locating farms near consumers may shorten supply chains and reduce emissions from refrigerated transport.

However, the technology faces significant economic obstacles. The electricity required for lighting and climate control can be expensive, especially in regions where renewable energy is not widely available. Labour costs may also remain high unless farms invest heavily in automation. For this reason, most profitable vertical farms currently focus on high-value crops such as herbs, salad leaves, and microgreens rather than staple foods like wheat or rice.

The future of vertical farming will probably depend on improvements in energy efficiency and crop selection. Advances in LED lighting have already reduced operating costs, while plant scientists are experimenting with varieties bred specifically for indoor growth. Although vertical farms are unlikely to replace traditional agriculture, they may become an important supplement in cities that want fresher produce and more resilient food systems.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Vertical farms usually grow crops in stacked layers.', answer: 'TRUE', explanation: 'The first paragraph defines vertical farming as crops grown "in stacked layers."' },
          { text: 'Vertical farming always uses natural sunlight instead of artificial lighting.', answer: 'FALSE', explanation: 'The passage mentions "artificial lighting" as part of controlled indoor production.' },
          { text: 'Most vertical farms are currently profitable when growing rice.', answer: 'FALSE', explanation: 'The passage says profitable farms focus on herbs, salad leaves, and microgreens rather than staple foods like rice.' },
          { text: 'Some plant varieties are being developed specifically for indoor growth.', answer: 'TRUE', explanation: 'The final paragraph states plant scientists are experimenting with varieties bred for indoor growth.' }
        ]
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Choose the correct letter, A, B, C, or D.',
        items: [
          {
            question: 'Which benefit of vertical farming is mentioned in the passage?',
            options: [
              'A. It eliminates all labour costs',
              'B. It can reduce water use through recirculation',
              'C. It makes wheat cheaper than field farming',
              'D. It requires no energy input'
            ],
            answer: 'B',
            explanation: 'The passage states that some systems use up to 90% less water because water is recirculated.'
          },
          {
            question: 'The main economic challenge described is:',
            options: [
              'A. the lack of urban consumers',
              'B. the cost of electricity and climate control',
              'C. the inability to grow salad leaves',
              'D. excessive rainfall inside farms'
            ],
            answer: 'B',
            explanation: 'The passage highlights electricity for lighting and climate control as a major cost.'
          }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What systems deliver nutrients directly to plant roots?', answer: 'hydroponic or aeroponic' },
          { question: 'What type of lighting has reduced operating costs?', answer: 'LED lighting' },
          { question: 'What kind of food systems may vertical farms help create?', answer: 'more resilient' }
        ]
      }
    ]
  },
  {
    id: 12,
    title: 'Why People Forget',
    level: 'easy',
    passage: `Forgetting is often seen as a failure of memory, but psychologists increasingly view it as a normal and useful process. Human beings encounter far more information than they can store permanently. If every detail were retained with equal strength, it would become difficult to identify what is relevant. Forgetting helps the brain prioritise information that is repeated, meaningful, or connected to current goals.

One common cause of forgetting is interference. Proactive interference occurs when old knowledge makes it harder to learn something new, such as when a person keeps entering an old password after changing it. Retroactive interference works in the opposite direction: new information disrupts the recall of older information. This can happen when students study two similar subjects in a single evening and later confuse the details.

Another explanation is retrieval failure. A memory may still exist, but the person lacks the right cue to access it. This is why a smell, song, or location can suddenly bring back a memory that seemed lost. The context in which information is learned can be particularly powerful. Students who revise in an environment similar to the exam room may find it easier to recall what they studied.

Forgetting can be reduced through active strategies. Spaced repetition, which involves reviewing material at increasing intervals, strengthens long-term retention. Self-testing is also effective because it forces learners to practise retrieval rather than simply reread notes. These techniques do not prevent forgetting completely, but they make important memories easier to access when needed.`,
    questions: [
      {
        id: 'q1',
        type: 'matching',
        question: 'Match each concept to the correct paragraph (A-D).',
        items: [
          'Using tests to practise recall',
          'Old information blocking new learning',
          'Forgetting as a useful filtering process',
          'Memories becoming accessible through cues'
        ],
        answers: ['D', 'B', 'A', 'C'],
        explanation: 'Strategies appear in D, interference in B, useful forgetting in A, and retrieval cues in C.'
      },
      {
        id: 'q2',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Psychologists now often regard forgetting as a normal process.', answer: 'TRUE', explanation: 'The passage says psychologists increasingly view forgetting as "normal and useful."' },
          { text: 'Retroactive interference means old knowledge blocks new learning.', answer: 'FALSE', explanation: 'That is proactive interference; retroactive interference is when new information disrupts older information.' },
          { text: 'A smell can act as a cue for memory retrieval.', answer: 'TRUE', explanation: 'The passage mentions a smell, song, or location bringing back a memory.' },
          { text: 'Spaced repetition completely prevents forgetting.', answer: 'FALSE', explanation: 'The passage says these techniques "do not prevent forgetting completely."' }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What type of interference occurs when old knowledge blocks new learning?', answer: 'proactive interference' },
          { question: 'What kind of repetition reviews material at increasing intervals?', answer: 'spaced repetition' },
          { question: 'What does self-testing force learners to practise?', answer: 'retrieval' }
        ]
      }
    ]
  },
  {
    id: 13,
    title: 'Restoring Historic Buildings',
    level: 'medium',
    passage: `Historic buildings provide cities with a visible link to their past. They can reveal how earlier communities lived, what materials were locally available, and which architectural styles were valued. For many residents, old buildings also create a sense of identity that modern developments sometimes fail to provide.

Restoration, however, is rarely straightforward. Conservation specialists must decide whether to preserve a building exactly as it is, return it to an earlier appearance, or adapt it for a new purpose. Each option involves compromise. A former warehouse converted into apartments may remain useful, but new windows, lifts, and safety systems can alter its original character.

Funding is another persistent challenge. Restoring traditional materials such as stone, timber, or handmade tiles can be far more expensive than using modern substitutes. Public grants may cover part of the cost, but owners often need additional income from tourism, events, or commercial tenants. Without a viable financial plan, restored buildings may quickly fall back into disrepair.

Despite these difficulties, adaptive reuse is gaining support. Environmental researchers point out that reusing an existing structure can save the embodied carbon already invested in its materials. Urban planners also argue that renovated heritage sites can attract visitors while keeping neighbourhoods distinctive. The best projects therefore combine respect for historical value with practical plans for long-term use.`,
    questions: [
      {
        id: 'q1',
        type: 'matching-headings',
        question: 'Match each paragraph (A-D) with the most suitable heading.',
        headings: [
          'i. The financial problem of conservation',
          'ii. A connection with local history',
          'iii. Benefits of giving old buildings new uses',
          'iv. Choosing the right restoration approach',
          'v. The decline of modern architecture'
        ],
        answers: ['ii', 'iv', 'i', 'iii'],
        explanation: 'A discusses links to the past, B discusses restoration choices, C focuses on funding, and D explains adaptive reuse.'
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Choose the correct letter, A, B, C, or D.',
        items: [
          {
            question: 'Why can converting a warehouse into apartments be a compromise?',
            options: [
              'A. It always destroys the building',
              'B. It may keep the building useful while changing original features',
              'C. It prevents the use of safety systems',
              'D. It removes the need for conservation specialists'
            ],
            answer: 'B',
            explanation: 'The passage says conversion may keep a building useful but alter its original character.'
          },
          {
            question: 'Environmental researchers support adaptive reuse because it can:',
            options: [
              'A. save embodied carbon in existing materials',
              'B. make all restoration projects cheap',
              'C. remove tourism from old neighbourhoods',
              'D. replace traditional materials with plastic'
            ],
            answer: 'A',
            explanation: 'The final paragraph states reusing a structure can save embodied carbon.'
          }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What do old buildings create for many residents?', answer: 'sense of identity' },
          { question: 'What type of tenants may provide income for restored buildings?', answer: 'commercial tenants' },
          { question: 'What kind of use plans should the best projects include?', answer: 'long-term use' }
        ]
      }
    ]
  },
  {
    id: 14,
    title: 'Digital Maps and Human Navigation',
    level: 'hard',
    passage: `Digital mapping applications have changed the way people move through cities. Turn-by-turn instructions reduce the anxiety of travelling in unfamiliar places, and live traffic data can help drivers avoid congestion. For delivery companies, ride-hailing services, and emergency responders, real-time navigation has become an essential operational tool.

Yet some researchers argue that constant reliance on digital maps may weaken spatial memory. Traditional navigation requires people to form mental maps by noticing landmarks, directions, and distances. When an application simply announces the next turn, users may reach their destination without understanding the wider layout of the area. Experiments in virtual towns have found that participants who navigated with step-by-step instructions later remembered fewer landmarks than those who explored more actively.

The issue is not that digital maps are inherently harmful, but that different modes of use encourage different habits. A pedestrian who previews the route, identifies major landmarks, and then puts the phone away is still engaging in active navigation. By contrast, someone who follows every instruction without looking beyond the screen may develop only a shallow understanding of the route.

Designers are now exploring ways to make navigation tools more educational. Some prototypes provide landmark-based instructions, such as "turn left after the library," rather than relying only on street names. Others ask users to estimate the direction of their destination before revealing the next step. These small changes aim to preserve the convenience of digital maps while encouraging users to build stronger mental representations of place.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Live traffic data can help drivers avoid congestion.', answer: 'TRUE', explanation: 'The first paragraph states this directly.' },
          { text: 'Researchers unanimously agree that digital maps are inherently harmful.', answer: 'FALSE', explanation: 'The passage says the issue is not that digital maps are inherently harmful.' },
          { text: 'Landmark-based instructions are being explored by designers.', answer: 'TRUE', explanation: 'The final paragraph mentions prototypes using landmark-based instructions.' },
          { text: 'All emergency responders have stopped using digital maps.', answer: 'NOT GIVEN', explanation: 'The passage says real-time navigation is essential for emergency responders, not that they stopped using it.' }
        ]
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Choose the correct letter, A, B, C, or D.',
        items: [
          {
            question: 'According to the passage, step-by-step instructions may reduce:',
            options: [
              'A. the cost of mobile phones',
              'B. people\'s memory for landmarks',
              'C. the number of delivery companies',
              'D. the accuracy of live traffic data'
            ],
            answer: 'B',
            explanation: 'The passage describes experiments where users of step-by-step instructions remembered fewer landmarks.'
          },
          {
            question: 'An example of active navigation is:',
            options: [
              'A. following every instruction without looking up',
              'B. ignoring all landmarks and distances',
              'C. previewing a route and identifying major landmarks',
              'D. using only street names in every instruction'
            ],
            answer: 'C',
            explanation: 'The passage gives this as an example of active navigation.'
          }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What kind of memory may digital-map reliance weaken?', answer: 'spatial memory' },
          { question: 'What do traditional navigators form by noticing landmarks and distances?', answer: 'mental maps' },
          { question: 'What are some prototypes based on instead of only street names?', answer: 'landmark-based instructions' }
        ]
      }
    ]
  },
  {
    id: 15,
    title: 'Community Repair Cafes',
    level: 'medium',
    passage: `In many cities, small volunteer-run workshops known as repair cafes have become a practical response to the culture of disposable consumer goods. Instead of throwing away a broken toaster, lamp, bicycle, or item of clothing, residents bring it to a community venue where volunteers help diagnose the problem and, when possible, repair it on the spot. The model began in the Netherlands in 2009 and has since spread to numerous countries.

The environmental argument for repair cafes is straightforward. Manufacturing new products requires raw materials, energy, transport, and packaging, while discarded goods often end up in landfill or low-value recycling streams. Extending the life of household items can therefore reduce both waste and carbon emissions. Although a single repaired kettle may seem insignificant, thousands of small repairs across a city can produce a measurable reduction in discarded electrical goods.

Repair cafes also have social benefits that are less obvious but equally important. They create spaces where older residents with practical skills can share knowledge with younger people who may have grown up replacing rather than repairing objects. Participants often report that they learn how products work and become more confident attempting simple repairs at home. In this sense, the cafe is not merely a free repair service; it is a form of informal education.

However, the movement faces limitations. Some modern products are difficult to open without specialist tools, and replacement parts may be expensive or unavailable. Safety rules also mean volunteers must avoid repairing certain high-risk electrical items. For this reason, campaigners argue that repair cafes should be supported by wider "right to repair" policies requiring manufacturers to provide spare parts, manuals, and designs that allow safe maintenance.`,
    questions: [
      {
        id: 'q1',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Repair cafes first appeared in the Netherlands.', answer: 'TRUE', explanation: 'The first paragraph states that the model began in the Netherlands in 2009.' },
          { text: 'Every item brought to a repair cafe can be repaired immediately.', answer: 'FALSE', explanation: 'The passage says volunteers repair items "when possible" and later describes limitations.' },
          { text: 'Repair cafes can help younger people learn practical skills.', answer: 'TRUE', explanation: 'The third paragraph says younger people can learn from older residents with practical skills.' },
          { text: 'Most repair cafes charge the same price as commercial repair shops.', answer: 'NOT GIVEN', explanation: 'The passage does not compare prices with commercial repair shops.' }
        ]
      },
      {
        id: 'q2',
        type: 'multiple-choice',
        question: 'Choose the correct letter, A, B, C, or D.',
        items: [
          {
            question: 'According to the passage, repairing household items can reduce:',
            options: [
              'A. the number of volunteers in cities',
              'B. the need for product manuals',
              'C. waste and carbon emissions',
              'D. the cost of specialist tools'
            ],
            answer: 'C',
            explanation: 'The second paragraph links longer product life with reduced waste and carbon emissions.'
          },
          {
            question: 'The writer suggests that right to repair policies would:',
            options: [
              'A. replace all community repair cafes',
              'B. make safe maintenance easier',
              'C. ban the sale of electrical goods',
              'D. remove the need for volunteers'
            ],
            answer: 'B',
            explanation: 'The final paragraph says policies could require parts, manuals, and designs that allow safe maintenance.'
          }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What type of goods culture are repair cafes responding to?', answer: 'disposable consumer goods' },
          { question: 'Where do many discarded goods end up?', answer: 'landfill' },
          { question: 'What kind of education can repair cafes provide?', answer: 'informal education' }
        ]
      }
    ]
  },
  {
    id: 16,
    title: 'Restoring Coral Reefs',
    level: 'hard',
    passage: `Coral reefs occupy a tiny fraction of the ocean floor, yet they support an extraordinary range of marine life. They also protect coastlines by reducing wave energy and provide food and income for millions of people. In recent decades, however, reefs have been placed under growing pressure from warming seas, pollution, destructive fishing practices, and ocean acidification.

One increasingly visible response is coral restoration. In some projects, fragments of healthy coral are grown in underwater nurseries and later transplanted onto damaged reefs. Other teams use land-based tanks where temperature, light, and water chemistry can be carefully controlled. Scientists are also experimenting with selectively breeding corals that show higher tolerance to heat, although this approach remains scientifically and ethically complex.

The results of restoration projects are mixed. At a local scale, transplanted corals can increase habitat complexity and help bring fish back to degraded areas. Restoration work can also engage coastal communities and create employment for divers, boat operators, and monitoring teams. Nevertheless, restoration is expensive and labour-intensive, and it cannot be applied across the enormous areas affected by marine heatwaves.

Many researchers therefore warn that restoration should not be treated as a substitute for reducing the causes of reef decline. If sea temperatures continue to rise, newly planted corals may suffer the same bleaching events that damaged the original reef. The most effective strategy is likely to combine local restoration with pollution control, sustainable fisheries management, and global reductions in greenhouse gas emissions.`,
    questions: [
      {
        id: 'q1',
        type: 'matching-headings',
        question: 'Match each paragraph (A-D) with the most suitable heading.',
        headings: [
          'i. Why restoration has limits',
          'ii. The value and vulnerability of reefs',
          'iii. Combining repair with prevention',
          'iv. Techniques used to rebuild coral',
          'v. The history of commercial diving'
        ],
        answers: ['ii', 'iv', 'i', 'iii'],
        explanation: 'A explains reef value and pressures. B lists restoration techniques. C describes benefits and limits. D argues restoration must be combined with prevention.'
      },
      {
        id: 'q2',
        type: 'true-false-ng',
        question: 'Do the following statements agree with the information given in the passage?',
        statements: [
          { text: 'Coral reefs protect coastlines by reducing wave energy.', answer: 'TRUE', explanation: 'The first paragraph states this directly.' },
          { text: 'Land-based coral tanks allow scientists to control environmental conditions.', answer: 'TRUE', explanation: 'The second paragraph mentions control of temperature, light, and water chemistry.' },
          { text: 'Restoration can currently be applied cheaply across all damaged reefs.', answer: 'FALSE', explanation: 'The passage says restoration is expensive, labour-intensive, and cannot be applied across enormous areas.' },
          { text: 'All scientists agree that selective breeding of corals is ethically simple.', answer: 'FALSE', explanation: 'The passage describes selective breeding as scientifically and ethically complex.' }
        ]
      },
      {
        id: 'q3',
        type: 'short-answer',
        question: 'Answer the following questions using NO MORE THAN THREE WORDS from the passage.',
        items: [
          { question: 'What events may damage newly planted corals if temperatures rise?', answer: 'bleaching events' },
          { question: 'What kind of fisheries management should accompany restoration?', answer: 'sustainable fisheries management' },
          { question: 'What do transplanted corals increase at a local scale?', answer: 'habitat complexity' }
        ]
      }
    ]
  }
]
