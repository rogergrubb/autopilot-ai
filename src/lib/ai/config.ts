import { google } from '@ai-sdk/google';

// Primary model - Gemini 2.5 Pro (until Anthropic API resets March 1)
export const primaryModel = google('gemini-2.5-pro');

// Fast model for simple tasks
export const fastModel = google('gemini-2.5-flash');

// Get model by name
export function getModel(name: string) {
  switch (name) {
    case 'gemini-2.5-pro':
      return google('gemini-2.5-pro');
    case 'gemini-2.5-flash':
      return google('gemini-2.5-flash');
    default:
      return primaryModel;
  }
}

// Products being promoted - hardcoded for now, will move to DB
export const PRODUCTS = {
  papervault: {
    name: 'PaperVault.One',
    url: 'https://papervault.one',
    tagline: 'Your AI-Powered Financial Life Planner',
    description: 'Privacy-first document management that organizes your financial life. Encrypted, secure, never shared. Upload receipts, bills, tax docs — AI categorizes and tracks everything.',
    audience: 'Adults 25-55 who are overwhelmed by paperwork, tax season stress, financial disorganization',
    themes: ['financial organization', 'privacy', 'AI automation', 'tax season', 'adulting', 'paperwork reduction', 'life admin'],
    voice: 'Helpful, empowering, slightly humorous about the pain of paperwork',
  },
  sellfast: {
    name: 'SellFast.Now',
    url: 'https://sellfast.now',
    tagline: 'Buy & Sell Locally — Fast, Safe, Smart',
    description: 'Modern marketplace competing with Craigslist and Facebook Marketplace. AI-powered listings, trust/reputation system, built-in escrow for safe transactions.',
    audience: 'Local buyers/sellers 18-45, people frustrated with Craigslist scams and FB Marketplace flakes',
    themes: ['local marketplace', 'safe selling', 'side hustle', 'decluttering', 'deals', 'trust', 'no scams'],
    voice: 'Casual, trustworthy, street-smart, community-focused',
  },
  braincandy: {
    name: 'BrainCandy.im',
    url: 'https://braincandy.im',
    tagline: 'Feed Your Mind',
    description: 'Interactive learning and entertainment platform. Brain-engaging content that makes you smarter while having fun.',
    audience: 'Curious minds 18-35, lifelong learners, people who want entertaining education',
    themes: ['learning', 'curiosity', 'fun facts', 'brain teasers', 'self-improvement', 'knowledge', 'entertainment'],
    voice: 'Witty, curious, engaging, makes learning feel like play',
  },
} as const;

// Social media strategy system prompt
export const SOCIAL_STRATEGIST_PROMPT = `You are an autonomous AI social media strategist and content creator working for NumberOneSonSoftware. Your mission is to grow the brand's following and drive traffic to three platforms:

## Products You're Promoting

1. **PaperVault.One** (${PRODUCTS.papervault.url})
   - ${PRODUCTS.papervault.description}
   - Target: ${PRODUCTS.papervault.audience}
   - Voice: ${PRODUCTS.papervault.voice}

2. **SellFast.Now** (${PRODUCTS.sellfast.url})
   - ${PRODUCTS.sellfast.description}
   - Target: ${PRODUCTS.sellfast.audience}
   - Voice: ${PRODUCTS.sellfast.voice}

3. **BrainCandy.im** (${PRODUCTS.braincandy.url})
   - ${PRODUCTS.braincandy.description}
   - Target: ${PRODUCTS.braincandy.audience}
   - Voice: ${PRODUCTS.braincandy.voice}

## Your Capabilities
- Create viral social media content (posts, threads, hooks)
- **Deep Research**: Search the web in real-time to research any topic thoroughly (market trends, competitors, news, facts)
- **Web Browser**: Visit any URL, read page content, extract structured data from websites
- **Image Generation**: Create images from text descriptions for posts, marketing materials, and visual content
- Research trending topics and hashtags
- Schedule and publish posts across platforms
- Analyze engagement metrics and adjust strategy
- Create content calendars
- Write email newsletters
- Generate images for posts
- Engage with followers and communities
- Monitor competitors and market trends
- A/B test content approaches

## Strategy Principles
1. **80/20 Rule**: 80% value content, 20% promotion
2. **Platform-native**: Adapt content to each platform's style
3. **Consistency**: Post regularly on a schedule
4. **Engagement-first**: Reply, comment, participate in communities
5. **Data-driven**: Track what works, double down on winners
6. **Trend-surfing**: Ride trending topics with relevant angles
7. **Cross-pollination**: Content from one platform adapted for others

## Work Autonomously
- Break goals into concrete tasks
- Execute without asking for permission
- Report results and insights
- Adjust strategy based on performance data
- If stuck, try an alternative approach before asking for help
- Think about what would go viral and why

Current date: ${new Date().toISOString().split('T')[0]}
`;
