/**
 * Seeded headline pool for DEMO MODE. These are synthetic/paraphrased
 * headline *shapes* representative of real financial news categories —
 * not scraped or copied from any live source — used so the whole pipeline
 * (dedupe -> filter -> analyze -> features -> prediction) has realistic
 * input without requiring a news API key.
 */
export interface SeedHeadline {
  title: string;
  description: string;
  source: string;
  eventType: string;
  assets: string[]; // primary assets this headline is about
  sentimentBias: number; // -1..1, rough hand-labeled bias used to keep demo data coherent
}

export const HEADLINE_POOL: SeedHeadline[] = [
  { title: "Fed signals slower pace of rate cuts amid sticky inflation", description: "Federal Reserve officials indicated a more cautious path on rate cuts, citing inflation readings above target.", source: "Reuters", eventType: "monetary_policy", assets: ["EURUSD", "SPY", "GOLD", "BTC"], sentimentBias: -0.5 },
  { title: "US CPI comes in below expectations, easing rate-cut worries", description: "Headline inflation cooled more than forecast, boosting bets on additional easing later this year.", source: "CNBC", eventType: "inflation", assets: ["SPY", "GOLD", "BTC", "EURUSD"], sentimentBias: 0.55 },
  { title: "Spot Bitcoin ETF inflows hit multi-week high", description: "US-listed spot Bitcoin ETFs recorded their largest daily net inflow in several weeks.", source: "CoinDesk", eventType: "etf", assets: ["BTC"], sentimentBias: 0.65 },
  { title: "Bitcoin ETF outflows accelerate as risk appetite fades", description: "Spot Bitcoin ETFs saw a third straight day of net redemptions.", source: "CoinDesk", eventType: "etf", assets: ["BTC"], sentimentBias: -0.6 },
  { title: "ECB holds rates steady, flags data-dependent path ahead", description: "The European Central Bank left its key rate unchanged and reiterated a meeting-by-meeting approach.", source: "Financial Times", eventType: "monetary_policy", assets: ["EURUSD"], sentimentBias: 0.1 },
  { title: "Dollar index climbs to two-month high on hawkish Fed bets", description: "The DXY extended gains as traders priced in a slower cutting cycle from the Federal Reserve.", source: "MarketWatch", eventType: "currency", assets: ["EURUSD", "GOLD", "BTC"], sentimentBias: -0.4 },
  { title: "Nonfarm payrolls beat estimates, unemployment rate ticks down", description: "The US economy added more jobs than expected last month, and the jobless rate fell.", source: "Reuters", eventType: "employment", assets: ["SPY", "EURUSD", "GOLD"], sentimentBias: 0.4 },
  { title: "Jobless claims rise more than forecast, labor market cools", description: "Weekly initial claims came in above consensus, adding to signs of a softening labor market.", source: "Yahoo Finance", eventType: "employment", assets: ["SPY", "GOLD"], sentimentBias: -0.35 },
  { title: "SEC delays decision on new crypto ETF applications", description: "The regulator pushed back its ruling deadline on a batch of pending crypto ETF filings.", source: "SEC", eventType: "regulation", assets: ["BTC", "ETH"], sentimentBias: -0.3 },
  { title: "SEC approves rule change easing crypto custody requirements", description: "A new rule change is expected to make it easier for institutions to custody digital assets.", source: "SEC", eventType: "regulation", assets: ["BTC", "ETH"], sentimentBias: 0.5 },
  { title: "Major tech earnings beat expectations, lift index futures", description: "Strong quarterly results from a large-cap technology company lifted broad equity futures.", source: "CNBC", eventType: "earnings", assets: ["SPY"], sentimentBias: 0.5 },
  { title: "Disappointing guidance from bellwether tech firm weighs on stocks", description: "Soft forward guidance from a widely-held technology name pressured index futures.", source: "CNBC", eventType: "earnings", assets: ["SPY"], sentimentBias: -0.45 },
  { title: "Escalating Middle East tensions push oil and gold higher", description: "Renewed geopolitical tensions in the region drove safe-haven flows into gold and oil.", source: "Reuters", eventType: "geopolitical", assets: ["GOLD", "SPY"], sentimentBias: 0.4 },
  { title: "Geopolitical risk premium fades as ceasefire talks progress", description: "Reports of progress in ceasefire negotiations eased safe-haven demand.", source: "Reuters", eventType: "geopolitical", assets: ["GOLD", "SPY"], sentimentBias: -0.2 },
  { title: "Ethereum network upgrade successfully activated on mainnet", description: "A scheduled protocol upgrade went live without issues, improving network throughput.", source: "The Block", eventType: "crypto_flows", assets: ["ETH"], sentimentBias: 0.45 },
  { title: "Large exchange outflows suggest accumulation by long-term holders", description: "On-chain data shows a sustained drawdown in exchange-held Bitcoin balances.", source: "CoinDesk", eventType: "crypto_flows", assets: ["BTC"], sentimentBias: 0.3 },
  { title: "Whale wallet moves large ETH position to exchange, stirring sell-off fears", description: "On-chain trackers flagged a large transfer of ether to a major exchange.", source: "The Block", eventType: "crypto_flows", assets: ["ETH"], sentimentBias: -0.35 },
  { title: "Gold hits fresh record as central banks keep buying", description: "Continued central bank gold purchases and softer real yields pushed prices to a new high.", source: "MarketWatch", eventType: "commodity", assets: ["GOLD"], sentimentBias: 0.5 },
  { title: "Gold slips as real yields climb on hawkish rate repricing", description: "Rising real yields weighed on non-yielding bullion.", source: "MarketWatch", eventType: "commodity", assets: ["GOLD"], sentimentBias: -0.4 },
  { title: "Oil prices jump on surprise OPEC+ supply cut", description: "A larger-than-expected production cut from OPEC+ members lifted crude prices sharply.", source: "Reuters", eventType: "oil", assets: ["GOLD", "SPY"], sentimentBias: 0.2 },
  { title: "US GDP growth revised higher for prior quarter", description: "Second-quarter GDP growth was revised up, beating the initial estimate.", source: "Federal Reserve", eventType: "economic_growth", assets: ["SPY", "EURUSD"], sentimentBias: 0.35 },
  { title: "Manufacturing PMI slips into contraction territory", description: "A closely-watched factory activity gauge fell below the 50 threshold, signaling contraction.", source: "MarketWatch", eventType: "economic_growth", assets: ["SPY", "EURUSD"], sentimentBias: -0.4 },
  { title: "Regional bank reports unexpected deposit outflows", description: "A mid-sized regional lender disclosed larger-than-expected deposit withdrawals last quarter.", source: "CNBC", eventType: "banking", assets: ["SPY"], sentimentBias: -0.5 },
  { title: "Banking sector stress eases as liquidity measures take hold", description: "Regulators' liquidity backstops appear to have calmed deposit flight concerns.", source: "Reuters", eventType: "banking", assets: ["SPY", "GOLD"], sentimentBias: 0.3 },
  { title: "US Treasury yields climb after strong retail sales data", description: "Better-than-expected retail sales pushed long-end Treasury yields higher.", source: "Reuters", eventType: "economic_growth", assets: ["SPY", "GOLD", "EURUSD"], sentimentBias: -0.15 },
  { title: "Crypto market structure bill clears key committee vote", description: "Proposed legislation clarifying digital asset regulation advanced out of committee.", source: "SEC", eventType: "market_structure", assets: ["BTC", "ETH"], sentimentBias: 0.4 },
  { title: "New AI chip export restrictions announced", description: "Fresh export controls on advanced semiconductors were announced, affecting large tech suppliers.", source: "Reuters", eventType: "technology", assets: ["SPY"], sentimentBias: -0.3 },
  { title: "Major cloud provider unveils new AI infrastructure investment", description: "A large-cap technology company announced a multibillion-dollar buildout of AI data center capacity.", source: "CNBC", eventType: "technology", assets: ["SPY"], sentimentBias: 0.3 },
];
