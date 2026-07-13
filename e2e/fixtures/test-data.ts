/**
 * Test data fixtures for E2E tests
 */

export interface Topic {
  id: string
  category: string
  title: string
  question: string
  answer: string
  scripture: Array<{reference: string; text: string}>
  catechism: string[]
  tags: string[]
  difficulty: string
  lang: string
}

export interface MockSearchResult {
  id: string
  title: string
  category: string
  excerpt: string
  relevance: number
}

// Mock topics for testing
export const MOCK_TOPICS: Record<string, Topic[]> = {
  en: [
    {
      id: 'eucharist-real-presence',
      category: 'sacraments',
      title: 'The Real Presence of Christ in the Eucharist',
      question: 'Why do Catholics believe that the bread and wine become the actual Body and Blood of Christ?',
      answer: 'Catholics believe in the Real Presence because Jesus explicitly stated "This is my body" and "This is my blood" at the Last Supper.',
      scripture: [
        { reference: 'John 6:53-56', text: 'Jesus said to them, "Amen, amen, I say to you, unless you eat the flesh of the Son of Man and drink his blood..."' },
        { reference: '1 Corinthians 11:27-29', text: 'Therefore whoever eats the bread or drinks the cup of the Lord unworthily will have to answer for the body and blood of the Lord.' }
      ],
      catechism: ['CCC 1374', 'CCC 1375'],
      tags: ['eucharist', 'transubstantiation', 'sacraments', 'mass', 'real presence'],
      difficulty: 'intermediate',
      lang: 'en'
    },
    {
      id: 'confession-sacrament',
      category: 'sacraments',
      title: 'The Sacrament of Confession',
      question: 'Why do Catholics confess their sins to a priest instead of directly to God?',
      answer: 'Catholics confess to priests because Jesus gave his apostles the authority to forgive sins in his name.',
      scripture: [
        { reference: 'John 20:22-23', text: 'Jesus said to them again, "Peace be with you. As the Father has sent me, so I send you."' },
        { reference: 'James 5:16', text: 'Therefore, confess your sins to one another and pray for one another, that you may be healed.' }
      ],
      catechism: ['CCC 1442', 'CCC 1444'],
      tags: ['confession', 'reconciliation', 'sacraments', 'penance', 'forgiveness'],
      difficulty: 'beginner',
      lang: 'en'
    },
    {
      id: 'mary-mother-of-god',
      category: 'mary',
      title: 'Mary as Mother of God',
      question: 'Why do Catholics call Mary the "Mother of God" if she is only human?',
      answer: 'Catholics call Mary "Mother of God" because she is the mother of Jesus Christ, who is both fully human and fully divine.',
      scripture: [
        { reference: 'Luke 1:43', text: 'And how does this happen to me, that the mother of my Lord should come to me?' },
        { reference: 'John 1:14', text: 'And the Word became flesh and made his dwelling among us...' }
      ],
      catechism: ['CCC 495', 'CCC 509'],
      tags: ['mary', 'mother-of-god', 'theotokos', 'jesus', 'divinity'],
      difficulty: 'intermediate',
      lang: 'en'
    }
  ],
  tl: [
    {
      id: 'eucharist-real-presence',
      category: 'sakramento',
      title: 'Ang Tunay na Presensya ni Kristo sa Eukaristiya',
      question: 'Bakit ang mga Katoliko ay naniniwala na ang tinapay at alak ay nagiging aktwal na Katawan at Dugo ni Kristo?',
      answer: 'Ang mga Katoliko ay naniniwala sa Tunay na Presensya dahil si Jesus ay tahasang nagsabi na "Ito ang aking katawan" at "Ito ang aking dugo" sa Huling Hapunan.',
      scripture: [
        { reference: 'Juan 6:53-56', text: 'Sinabi ni Jesus sa kanila, "Amen, amen, sinasabi ko sa inyo, maliban kung kumain kayo ng laman ng Anak ng Tao at uminom kayo ng kaniyang dugo..."' },
        { reference: '1 Corintio 11:27-29', text: 'Kaya ang sinumang kumakain ng tinapay o umiinom ng tas ng Panginoon nang hindi karapat-dapat ay mananagot sa katawan at dugo ng Panginoon.' }
      ],
      catechism: ['CCC 1374', 'CCC 1375'],
      tags: ['eukaristiya', 'transubstansasyon', 'sakramento', 'misa', 'tunay na presensya'],
      difficulty: 'intermediate',
      lang: 'tl'
    },
    {
      id: 'confession-sacrament',
      category: 'sakramento',
      title: 'Ang Sakramento ng Kumpisal',
      question: 'Bakit ang mga Katoliko ay kumukumpisal sa mga pari imbes na direkta sa Diyos?',
      answer: 'Ang mga Katoliko ay kumukumpisal sa mga pari dahil si Jesus ay bigyan ng kaniyang mga apostol ang awtoridad na patawarin ng mga kasalanan sa kaniyang pangalan.',
      scripture: [
        { reference: 'Juan 20:22-23', text: 'Sinabi ni Jesus sa kanila muli, "Kapayapaan sa inyo. Sina ama ang nagpadala sa akin, kaya ganun din ako nagpapadala sa inyo."' },
        { reference: 'Santiago 5:16', text: 'Kaya kumpisalinyo ang mga kasalanan ninyo sa isa\'t isa at manalangin para sa isa\'t isa, upang kayo ay gumaling.' }
      ],
      catechism: ['CCC 1442', 'CCC 1444'],
      tags: ['kumpisal', 'pagkakasundo', 'sakramento', 'panata', 'patawad'],
      difficulty: 'beginner',
      lang: 'tl'
    }
  ],
  ceb: [
    {
      id: 'eucharist-real-presence',
      category: 'sakramento',
      title: 'Ang Tinood nga Presensya ni Kristo sa Eukaristiya',
      question: 'Bakit ang mga Katoliko motuo nga ang tinapay ug alak nahimong aktwal nga Katawan ug Dugo ni Kristo?',
      answer: 'Ang mga Katoliko motuo sa Tinood nga Presensya tungod kay si Jesus sa pagtinago miingon nga "Kini ang akong lawas" ug "Kini ang akong dugo" sa Katapusan nga Hapunan.',
      scripture: [
        { reference: 'Juan 6:53-56', text: 'Miingon si Jesus sa kanila, "Amen, amen, ingon ko sa inyo, kon dili mo makaton sa lawas sa Anak sa Tao ug imom inyo sa iyang dugo..."' },
        { reference: '1 Corintio 11:27-29', text: 'Consequently, whoever eats the bread or drinks the cup of the Lord unworthily will have to answer for the body and blood of the Lord.' }
      ],
      catechism: ['CCC 1374', 'CCC 1375'],
      tags: ['eukaristiya', 'transubstansasyon', 'sakramento', 'misa', 'tinood nga presensya'],
      difficulty: 'intermediate',
      lang: 'ceb'
    },
    {
      id: 'confession-sacrament',
      category: 'sakramento',
      title: 'Ang Sakramento sa Kumpisal',
      question: 'Bakit ang mga Katoliko mosumpal sa mga pari dili sa direkta sa Diyos?',
      answer: 'Ang mga Katoliko mosumpal sa mga pari tungod kay si Jesus hatag sa iyang mga apostol sa awtoridad sa patawad sa mga sala sa iyang ngalan.',
      scripture: [
        { reference: 'Juan 20:22-23', text: 'Miingon si Jesus sa kanila usab, "Kalinaw sa inyo. Sama sa akong amahan nga nagpadala kanako, ingon usab ako nga mopadala kaninyo."' },
        { reference: 'Santiago 5:16', text: "Consequently, confess your sins to one another and pray for one another, that you may be healed." }
      ],
      catechism: ['CCC 1442', 'CCC 1444'],
      tags: ['kumpisal', 'pagkasinabotay', 'sakramento', 'panata', 'patawad'],
      difficulty: 'beginner',
      lang: 'ceb'
    }
  ]
}

// Search queries for testing
export const SEARCH_QUERIES = {
  en: {
    basic: 'Eucharist',
    cebuano: 'Eukaristiya',
    broad: 'a',
    specific: 'Real Presence',
    tagalog: 'Sakramento',
    nonExistent: 'xyz123nonexistent'
  },
  tl: {
    basic: 'Eukaristiya',
    english: 'Eucharist',
    broad: 'a',
    specific: 'Tunay na Presensya',
    tagalog: 'Sakramento',
    nonExistent: 'xyz123nonexistent'
  },
  ceb: {
    basic: 'Eukaristiya',
    english: 'Eucharist',
    broad: 'a',
    specific: 'Tinood nga Presensya',
    tagalog: 'Sakramento',
    nonExistent: 'xyz123nonexistent'
  }
}

// Test user journeys
export const USER_JOURNEYS = {
  searchWorkflow: {
    name: 'Complete Search Workflow',
    steps: [
      'Navigate to homepage',
      'Enter search query',
      'Wait for debounced results',
      'Click on search result',
      'Navigate to topic detail',
      'Verify content display'
    ]
  },
  languageSwitching: {
    name: 'Language Switching Workflow',
    steps: [
      'Navigate to homepage',
      'Click language switcher',
      'Select different language',
      'Verify content translation',
      'Test persistence across reload'
    ]
  },
  offlineExperience: {
    name: 'Offline Experience Workflow',
    steps: [
      'Start with online connection',
      'Navigate and interact with app',
      'Go offline',
      'Verify offline banner appears',
      'Test cached content access',
      'Go back online',
      'Verify banner disappears'
    ]
  }
}

// Performance benchmarks
export const PERFORMANCE_BENCHMARKS = {
  loadTime: {
    fast: 2000,     // Under 2 seconds
    acceptable: 5000, // Under 5 seconds
    slow: 10000     // Over 10 seconds
  },
  searchTime: {
    fast: 500,      // Under 0.5 seconds
    acceptable: 1000, // Under 1 second
    slow: 2000      // Over 2 seconds
  },
  navigationTime: {
    fast: 1000,     // Under 1 second
    acceptable: 3000, // Under 3 seconds
    slow: 5000      // Over 5 seconds
  }
}

// Accessibility test cases
export const ACCESSIBILITY_TESTS = {
  keyboardNavigation: [
    'Tab through interactive elements',
    'Enter to activate buttons and links',
    'Escape to close modals and dropdowns',
    'Arrow keys for navigation within components'
  ],
  screenReader: [
    'ARIA labels and descriptions',
    'Semantic HTML structure',
    'Alt text for images',
    'Live regions for dynamic content'
  ],
  visual: [
    'Color contrast ratios',
    'Text resizing support',
    'Focus indicators',
    'Touch target sizes'
  ]
}

// PWA test scenarios
export const PWA_SCENARIOS = {
  installation: {
    supported: 'Test in browsers that support PWA installation',
    unsupported: 'Test in browsers without PWA support',
    dismissed: 'Test when user dismisses install prompt',
    accepted: 'Test when user accepts installation'
  },
  offline: {
    cached: 'Test cached content accessibility',
    uncached: 'Test uncached content behavior',
    sync: 'Test data synchronization when back online'
  },
  serviceWorker: {
    registration: 'Test service worker registration',
    update: 'Test service worker updates',
    error: 'Test service worker error handling'
  }
}