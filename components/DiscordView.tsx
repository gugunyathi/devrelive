import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Hash, Search, ChevronDown, BellOff, Users, MessageSquare, Plus, MoreHorizontal, Menu, X, Phone, Calendar, Clock, CheckCircle2, Send, MessageCircle, Wrench } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const INITIAL_POSTS = [
  { id: '1', channelId: 'developer-forum', title: 'App data displayed incorrectly in "Pinned apps"', content: 'I\'m launching my mini app "Squadletics" on Base app but I encountered an issue that I can\'t figure out how to solve. I think maybe there\'s some kind of a bug on the Base app side, or maybe I\'m doing something wrong. So Squadletics now can be found among "Apps" in the search. In search results, it displays the correct icon, name and tagline. And when I click it, it opens etc. But then when I pin it to "My apps", in "My apps" list it displays no icon, name is incorrect and it leads to the wrong URL (leads to <squadletics dot com> when it\'s clearly set in the manifest that homeUrl is <squadletics dot com /baseapp> Do you know why it might be happening? On Farcaster it\'s being displayed correctly and leads to the correct URL etc.', author: 'Linas | true.eth', replies: 7, time: '1/23/26, 7:18 PM', tags: ['Mini Apps', 'Bug Report'], hasImage: true, resolved: false },
  { id: '2', channelId: 'developer-forum', title: 'is the "mini app" concept still supported by base app?', content: 'now that farcaster is going away, is the mini app going to be removed from base app?', author: 'vDan', replies: 3, time: '2/19/26, 6:26 AM', tags: ['Mini Apps', 'Question'], hasImage: false, resolved: true },
  { id: '3', channelId: 'developer-forum', title: 'base.dev - something went wrong', content: 'looking for info regarding an error registering apps on base.dev', author: 'kieran', replies: 5, time: '2/22/26, 7:05 PM', tags: ['Bug Report'], hasImage: false, resolved: false },
  { id: '4', channelId: 'developer-forum', title: 'PathDB geth snapshot?', content: 'Hello everyone, I\'d like to know if there\'s a pathdb snapshot for geth available. The one at https://docs.base.org/base-chain/node-operators/snapshots is hashdb', author: 'Lolmode', replies: 4, time: '2/23/26, 7:59 PM', tags: ['Node'], hasImage: false, resolved: true },
  { id: '5', channelId: 'developer-forum', title: 'Can\'t sign into base.dev with my wallet', content: 'After I keyed in my passphrase to log in into base.dev I\'m receiving the following error: {\n"message": "No signers found",\n"stack": "Error: No signers found\\n at wL..."}', author: 'cell', replies: 8, time: '2/27/26, 6:17 AM', tags: ['Base Account', 'Bug Report'], hasImage: false, resolved: false },
  { id: '6', channelId: 'developer-forum', title: 'Why won\'t my link to the game open? I get this error message.Please wait while we verify your identi', content: 'I\'m having trouble with my application on base.dev. When I try to access the link, it throws an error and asks me to verify my identity, but the verification process never completes.\n\nHas anyone else experienced this issue recently? Here are my logs:\n\nError: Verification timeout at 30000ms\nat Object.verifyIdentity (/app/src/auth.ts:42:15)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)', author: 'Ruslan S.', replies: 6, time: '2/25/26, 10:57 PM', tags: ['Mini Apps'], hasImage: true, resolved: false },
  { id: '7', channelId: 'developer-forum', title: 'How to Get OBN Token Listed As An AppCoin is Base App', content: 'Recently, Base App added a new feature where coins can be labeled as AppCoins and the application associated with the coin can be displayed on the coin’s page. I was wondering if you could help get the Olive Branch Network listed as an AppCoin with its app displayed on the coin’s page? I asked about this in my group with the Base NA team and was asked to post the question in this forum.', author: 'jack2163', replies: 3, time: '2/27/26, 9:28 PM', tags: ['Question'], hasImage: false, resolved: false },
  { id: '8', channelId: 'developer-forum', title: 'Proof of ownership doesn\'t work', content: 'Proof of ownership doesn\'t work, although everything seems to be correct', author: 'TokoGaz', replies: 5, time: '2/27/26, 11:06 PM', tags: ['Bug Report'], hasImage: true, resolved: false },
  { id: '9', channelId: 'developer-forum', title: 'Shipped my first dApp on Base — Shitcoin Graveyard (NFT tombstones for dead tokens)', content: 'Hey builders! Just deployed my first project on Base and wanted to share. Shitcoin Graveyard — a dApp where users bury their dead ERC-20 tokens and receive an animated on-chain SVG tombstone NFT. How it works:\n● Connect wallet → auto-scans for your tokens\n● Pick a dead token, write a custom epitaph\n● Token gets locked in the contract forever\n● You receive an animated NFT tombstone (flickering candles, twinkling stars, floating particles)\nTech stack:\n● Solidity (ERC-721 + SafeERC20)\n● Next.js 14 + TypeScript\n● RainbowKit + Wagmi v2\n● Tailwind CSS + Framer Motion', author: 'bezdar`?', replies: 4, time: 'Yesterday at 3:59 PM', tags: ['Discussion'], hasImage: false, resolved: false },
  { id: '10', channelId: 'developer-forum', title: 'base.dev something went wrong message, no matter what I try', content: 'I tried everything I know', author: 'Kurogane (黒鋼)', replies: 7, time: 'Yesterday at 10:10 PM', tags: ['Bug Report'], hasImage: true, resolved: false },
  { id: 'tg1', channelId: 'developer-forum', title: 'Smart contract deployment failing with out of gas', content: 'Hey everyone, I am trying to deploy a new ERC20 contract but it keeps failing with out of gas error. I have increased the gas limit but it still fails. Any ideas?', author: 'CryptoDev_TG', replies: 2, time: 'Today at 9:15 AM', tags: ['Smart Contracts', 'Bug Report'], hasImage: false, resolved: false, source: 'telegram' },
  { id: 'tg2', channelId: 'developer-forum', title: 'How to verify contract on Basescan?', content: 'I deployed my contract but having trouble verifying it on Basescan using Hardhat. The API key seems correct but it says "Failed to verify".', author: 'Web3Builder_TG', replies: 4, time: 'Today at 10:30 AM', tags: ['Tooling', 'Question'], hasImage: false, resolved: true, source: 'telegram' },
];

const MOCK_REPLIES = [
  { id: 'r1', postId: '1', author: 'Base | Sift AI Support Agent', role: 'admin', time: '1/23/26, 7:18 PM', content: 'It appears you\'re experiencing issues with how your Mini App, Squadletics, is displayed in the Base app\'s "My apps" list compared to search results and Farcaster. The problem could stem from issues related to app discovery and indexing, manifest configuration problems, or client-specific behavior within the Base app. To troubleshoot, consider these steps...', hasImage: false },
  { id: 'r2', postId: '1', author: 'Linas | true.eth', role: 'user', time: '1/23/26, 7:58 PM', content: '@Base | Sift AI Support Agent I\'ve done all these steps already, the issue persists', hasImage: false },
  { id: 'r3', postId: '1', author: 'stpn.base.eth', role: 'admin', time: '1/26/26, 9:28 PM', content: 'Hey, sorry I overlooked this one somehow. However I am unable to help with this one, sorry. Hey @kacperrr0.base.eth, can you help with this one? Anyway your ENS domain is fire @Linas | true.eth', hasImage: false },
  { id: 'r4', postId: '1', author: 'Gugu', role: 'admin', time: '2/17/26, 11:28 PM', content: 'Hi @Linas | true.eth Apologies that you couldn\'t get a solution insofar but I hope this can help get you closer to a solution. I\'ve just looked at your app metadata on base.dev/preview right now, and it seems your most recent production deployment has errors in the manifest per screenshot attached. Seems the images in red on the screenshot are the wrong sizes. the icon for example should be 1024x1024 but your app\'s icon is 512x512, which could be causing it not to show up on the Base App when you pin your app. Some of the other images seem to have incorrect sizes too per screenshot. Try fixing those and deploy again, then check on base.dev/preview or let me know to check once deployed. the images can be found in your /public folder in your app directory.', hasImage: false },
  { id: 'r5', postId: '1', author: 'Linas | true.eth', role: 'user', time: '2/18/26, 6:47 PM', content: 'You\'re right, just checked, and the icon is now the right size, your metadata shows no errors in base.dev/preview but the icon logo doesn\'t show in the pinned apps on Base App. Let me check in detail to see if there is something we\'re missing. Also tagging @Sohey in the meantime for input/suggestions on how to fix this', hasImage: false },
  { id: 'r6', postId: '1', author: 'Gugu', role: 'admin', time: '2/18/26, 7:10 PM', content: 'according to the Base Docs, the manifest should be signed with your root domain (e.g., squadletics.com), not a subpath like squadletics.com/baseapp. The accountAssociation payload contains your domain, and the manifest must be accessible at https://squadletics.com/.well-known/farcaster.json. The pinned icon in the Base app is controlled by the iconUrl field in your manifest\'s miniapp object — it should be a 1024×1024px PNG. The domain you sign with doesn\'t directly affect how the icon renders, but if the domain doesn\'t match where your manifest is hosted, the account association verification will fail and your app won\'t work properly So it seems changing the domain wont fix the unrendered pinned icon issue Let me keep digging Something to note regards the icon.png image: Icon spec requirements: The Base App requires iconUrl to be a 1024×1024px PNG with no alpha transparency. If your icon doesn\'t meet these specs, it may fail to render in the Base App. Please check that the icon.png has no alpha transaparency', hasImage: false },
  { id: 'r7', postId: '1', author: 'kacperrr0.base.eth', role: 'admin', time: '2/18/26, 8:37 PM', content: 'I believe it’s up to you. Personally, I’d use a subdomain instead and first try adding it as a new URL, because you can’t really remove the Mini app you’ve already imported. Once you do this, don’t forget to sign your manifest using the new domain: regenerate the accountAssociation credentials in your manifest (remove the current ones, generate new ones, and place them in the manifest), and change all permalinks to the new domain, as Gugu mentioned. I’d give it a try, maybe we can resolve your issue this way before the team fixes it internally with no ETA.', hasImage: false },
  { id: 'r8', postId: '2', author: 'Base | Sift AI Support Agent', role: 'admin', time: '2/19/26, 6:26 AM', content: 'I\'m not able to confidently answer this question. @Based Advocate Lead can help you resolve this. Security Warning: Please be cautious. Do NOT accept friend requests, open DMs, or click external links claiming to help with this issue. All official communication will happen directly in this thread.', hasImage: false },
  { id: 'r9', postId: '2', author: 'vDan', role: 'user', time: '2/19/26, 7:51 AM', content: 'Base Mini Apps will not go away, and will continue to be supported by Base. Base is committing more resources to support builders across the ecosystem, including Mini Apps. check out batches.base.org and check out the new leaderboards of top Base Mini Apps on base.dev - which is a new feature to amplify leading mini apps and drive distribution and users to these apps.', hasImage: false },
  { id: 'r10', postId: '2', author: 'Gugu', role: 'admin', time: '2/20/26, 7:34 PM', content: 'base.dev tracks your app\'s onchain analytics, including: Total transactions attributed to your app User acquisition and conversion metrics Onchain usage data It also powers discovery features like App Leaderboards and the Base App store Builder Codes track onchain activity attribution — they identify which app originated a transaction. Specifically: They are appended to transaction calldata as a data suffix (per ERC-8021) Offchain indexers extract the codes after transactions are processed to attribute activity back to your app This attribution qualifies you for potential future rewards In short, Builder Codes are the mechanism for attribution, and base.dev is the dashboard where you view the resulting analytics. Source: https://docs.base.org/base-chain/builder-codes/app-developers', hasImage: false },
  { id: 'r11', postId: '3', author: 'Base | Sift AI Support Agent', role: 'admin', time: '2/22/26, 7:05 PM', content: 'To troubleshoot app registration errors on Base.dev, you can use the Preview tool to validate your app\'s manifest and metadata, and test how your app will appear in the Base app. The Preview tool provides visual cues such as green check marks for correct setups and red indicators for issues needing attention. If problems persist, you can report issues through the Blockaid Reporting Portal or seek support from the Base core team on Discord.', hasImage: false },
  { id: 'r12', postId: '3', author: 'kieran', role: 'user', time: '2/22/26, 7:05 PM', content: 'it\'s set up correctly just getting literal error codes', hasImage: false },
  { id: 'r13', postId: '3', author: 'Xiaomao', role: 'admin', time: '2/22/26, 7:24 PM', content: 'Hi, your manifest is not signed and configured properly. It needs to be accessible at https://your-domain.com/.well-known/farcaster.json Take a look at this https://docs.base.org/mini-apps/technical-guides/sign-manifest. also, please make sure the base:app_id tag is hardcoded directly inside the <head> of your root layout so it appears in the initial server-rendered HTML, not added dynamically.', hasImage: false },
  { id: 'r14', postId: '3', author: 'kieran', role: 'user', time: '2/22/26, 7:42 PM', content: 'lol thanks I\'m gona give that a try. are you sure it\'s not because it was previously registered because i accidentally verified it for a different app which i thought could be the case', hasImage: false },
  { id: 'r15', postId: '3', author: 'Gugu', role: 'admin', time: '2/22/26, 7:59 PM', content: 'Hi @kieran - if you previously verified with a different domain, you need to do this: Remove all previous app details from your manifest (farcaster.json): clear the old accountAssociation (header, payload, signature), and remove any previous domain-specific or app-specific metadata (including fc:miniapp HTML meta tags with the old app\'s info). Deploy to production with the cleaned manifest (empty accountAssociation fields). Go to Base.dev → Account Association tool, paste your new domain, click "Submit", then "Verify" and sign with your wallet. Copy the new accountAssociation object and paste it into your manifest, then redeploy. Go to Base.dev/preview to check your manifest and fix any errors', hasImage: false },
  { id: 'r16', postId: '4', author: 'Base | Sift AI Support Agent', role: 'admin', time: '2/23/26, 7:59 PM', content: 'Geth Archive Nodes are no longer supported via snapshots due to performance limitations. For Archive functionality, please use Reth. The documentation at https://docs.base.org/base-chain/node-operators/snapshots provides snapshots for Mainnet and Testnet using Reth and Geth clients. It is updated weekly to help reduce initial sync time.', hasImage: false },
  { id: 'r17', postId: '4', author: 'Lolmode', role: 'user', time: '2/23/26, 8:06 PM', content: 'I only need full node snapshot with state.scheme being \'path\' Do such snapshots exist? We have an in-house tool that can only work with pathdb, and syncing from scratch will take forever', hasImage: false },
  { id: 'r18', postId: '4', author: 'Gugu', role: 'admin', time: '2/23/26, 8:46 PM', content: 'tagging @Jon Roethke and @kacperrr0.base.eth to respond to this thread', hasImage: false },
  { id: 'r19', postId: '4', author: 'Jon Roethke', role: 'admin', time: '2/26/26, 6:57 PM', content: 'No, we do not provide an official Geth snapshot with pathdb (PBSS). We also recommend moving away from Geth to Reth for high-performance needs.', hasImage: false },
];

const TAGS = ['Node', 'Base Account', 'Onchain Kit', 'Mini Apps', 'AI Agents', 'Feedback', 'Bug Report', 'Question', 'Discussion'];

/** Channels that use a plain chat UI (no forum posts/threads) */
const CHAT_CHANNELS = new Set(['developer-chat', 'node-operators', 'mini-apps', 'base-build', 'ai-agents']);

const CHANNEL_DESCRIPTIONS: Record<string, string> = {
  'developer-chat': 'General chat for developers who are building on Base',
  'node-operators': 'Discussion for Base node operators',
  'mini-apps': 'Chat for mini app builders',
  'base-build': 'Building on Base — share what you\'re shipping',
  'ai-agents': 'AI agent development on Base',
};

type ChatMessage = { id: string; author: string; role: string; time: string; content: string };

const INITIAL_CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  'developer-chat': [
    { id: 'dc1', author: 'Blackbox', role: 'user', time: 'Today at 11:45 AM', content: 'I have collected: Only 2 transfer attempts in 372 transactions (both failed)\n\nI also found another four $USDC TOKEN DISTRIBUTION (Scam attempts)\nBase is relatively clean, and my tools are designed to keep it clean by unwebbing these bad deployers.\n\nPlease help by reporting any airdropped tokens\n\nYou can:\nA. Just give me the contract address or a contaminated EOA address.\nB. Go to https://www.blackboxmint.com/balances/ and add your address to the scanner.\n\nDust is anything you never asked for. Dust can be:\n• A broken contract\n• The feds tracking\n• Universities experimenting\n• A scam or a lure to a scam.\n\nPlease share your dust' },
    { id: 'dc2', author: 'imbanytui | Unity Nodes', role: 'user', time: 'Today at 12:08 PM', content: 'The base really tries to keep the ecosystem clean, but the openness of the blockchain allows anyone to deploy anything\n\nIt\'s best to just ignore these tokens' },
    { id: 'dc3', author: 'vDan', role: 'user', time: 'Today at 12:15 PM', content: 'Anyone else seeing increased gas fees today? My deployments are taking longer than usual' },
    { id: 'dc4', author: 'cryptobuildoor', role: 'user', time: 'Today at 12:22 PM', content: 'yeah gas has been a bit spiky the last hour or so, probably some mempool congestion' },
    { id: 'dc5', author: 'Gugu', role: 'admin', time: 'Today at 12:30 PM', content: 'Hey all 👋 just a reminder — our weekly office hours are tomorrow at 3pm UTC. Drop your questions in #developer-forum if you want them covered!' },
  ],
  'node-operators': [
    { id: 'no1', author: 'Jon Roethke', role: 'admin', time: 'Yesterday at 4:00 PM', content: 'Reminder: We\'ve updated the snapshot documentation at https://docs.base.org/base-chain/node-operators/snapshots — the weekly mainnet Reth snapshot is now available.' },
    { id: 'no2', author: 'Lolmode', role: 'user', time: 'Yesterday at 4:10 PM', content: 'Is there any ETA on PathDB (PBSS) snapshots for geth? Syncing from scratch is taking forever' },
    { id: 'no3', author: 'Jon Roethke', role: 'admin', time: 'Yesterday at 4:18 PM', content: 'No official PBSS snapshot planned — we recommend migrating to Reth for high-performance nodes. Much better perf characteristics.' },
    { id: 'no4', author: 'node_runner_42', role: 'user', time: 'Today at 8:30 AM', content: 'My reth node dropped off the network overnight, any known issues?' },
    { id: 'no5', author: 'kacperrr0.base.eth', role: 'admin', time: 'Today at 9:00 AM', content: 'Nothing on our end — might be a peer connectivity issue. Try restarting with --max-outbound-peers 50' },
    { id: 'no6', author: 'node_runner_42', role: 'user', time: 'Today at 9:12 AM', content: 'That fixed it, thanks!' },
  ],
  'mini-apps': [
    { id: 'ma1', author: 'Xiaomao', role: 'admin', time: 'Yesterday at 2:00 PM', content: 'PSA: Make sure your base:app_id meta tag is hardcoded in your root layout HTML — not injected dynamically. Apps with dynamic tags are failing manifest verification.' },
    { id: 'ma2', author: 'kieran', role: 'user', time: 'Yesterday at 2:15 PM', content: 'oh that explains my issue! I was injecting it with useEffect 🤦' },
    { id: 'ma3', author: 'Linas | true.eth', role: 'user', time: 'Yesterday at 3:00 PM', content: 'Quick question — does the icon.png need to be exactly 1024x1024, or is that just a recommendation?' },
    { id: 'ma4', author: 'Gugu', role: 'admin', time: 'Yesterday at 3:05 PM', content: 'It needs to be exactly 1024×1024px PNG with no alpha transparency. If it has an alpha channel, it will fail to render in Base App.' },
    { id: 'ma5', author: 'bezdar', role: 'user', time: 'Today at 10:00 AM', content: 'Just shipped my first mini app on Base! NFT tombstones for dead ERC-20 tokens. Check it out at shitcoingraveyard.xyz 😅' },
    { id: 'ma6', author: 'vDan', role: 'user', time: 'Today at 10:08 AM', content: 'haha great concept 😂 good use of the token-locking pattern' },
    { id: 'ma7', author: 'Xiaomao', role: 'admin', time: 'Today at 10:20 AM', content: 'Nice! Make sure to register it on base.dev so it shows up in the leaderboards and discovery features 🚀' },
  ],
  'base-build': [
    { id: 'bb1', author: 'Base | Sift AI Support Agent', role: 'admin', time: '2 days ago', content: 'Welcome to #base-build! Share what you\'re building on Base here. Check out batches.base.org for builder resources and community support.' },
    { id: 'bb2', author: 'jack2163', role: 'user', time: 'Yesterday at 11:30 AM', content: 'Working on getting OBN (Olive Branch Network) listed as an AppCoin on Base App. Any devs who\'ve done this before have tips?' },
    { id: 'bb3', author: 'Gugu', role: 'admin', time: 'Yesterday at 11:45 AM', content: 'Best to post in #developer-forum so we can track it properly. Make sure your coin contract is verified on Basescan first.' },
    { id: 'bb4', author: 'stpn.base.eth', role: 'admin', time: 'Today at 8:00 AM', content: 'Base Batches cohort applications are open! Apply at batches.base.org — 6-week accelerator with technical support and funding.' },
    { id: 'bb5', author: 'cell', role: 'user', time: 'Today at 8:45 AM', content: 'Do you need a live product to apply, or is early-stage ok?' },
    { id: 'bb6', author: 'stpn.base.eth', role: 'admin', time: 'Today at 8:50 AM', content: 'Early stage is totally fine! They\'re looking for ambitious builders, not finished products.' },
    { id: 'bb7', author: 'Ruslan S.', role: 'user', time: 'Today at 11:00 AM', content: 'Anyone using OnchainKit for their frontend? Having trouble with the wallet connection flow on mobile' },
    { id: 'bb8', author: 'cryptobuildoor', role: 'user', time: 'Today at 11:05 AM', content: 'yeah had that issue — make sure you\'re on the latest @coinbase/onchainkit, they fixed a mobile wallet bug in v0.38' },
  ],
  'ai-agents': [
    { id: 'ag1', author: 'Gugu', role: 'admin', time: '2 days ago', content: 'AI agents section is heating up 🤖 If you\'re building AI agents on Base (CDP AgentKit, LangChain, etc.) share your builds here!' },
    { id: 'ag2', author: 'imbanytui | Unity Nodes', role: 'user', time: 'Yesterday at 1:00 PM', content: 'Has anyone used CDP AgentKit with on-chain actions? Curious how well it handles complex multi-step transactions' },
    { id: 'ag3', author: 'Web3Builder_TG', role: 'user', time: 'Yesterday at 1:20 PM', content: 'I built an agent that auto-compounds LP positions using CDP AgentKit. The wallet actions work really smoothly once you get the prompts right' },
    { id: 'ag4', author: 'imbanytui | Unity Nodes', role: 'user', time: 'Yesterday at 1:28 PM', content: 'nice! did you run into issues with gas estimation for complex multicalls?' },
    { id: 'ag5', author: 'Web3Builder_TG', role: 'user', time: 'Yesterday at 1:35 PM', content: 'a bit — I ended up adding a 1.3x gas buffer multiplier on estimates. No failures since' },
    { id: 'ag6', author: 'CryptoDev_TG', role: 'user', time: 'Today at 9:00 AM', content: 'Just open-sourced my Base AI trading agent — uses Gemini + CDP for on-chain execution. Feedback welcome!' },
    { id: 'ag7', author: 'Gugu', role: 'admin', time: 'Today at 9:30 AM', content: 'Awesome, sharing this in the weekly builder roundup! Also check out the AI Agents track at batches.base.org 👀' },
  ],
};

interface DiscordViewProps {
  onStartCall?: (title: string, context?: string) => void;
  onNavigateToRepair?: () => void;
  isTelegramConnected?: boolean;
}

export function DiscordView({ onStartCall, onNavigateToRepair, isTelegramConnected = false }: DiscordViewProps) {
  const { address, signIn } = useAuth();
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [replies, setReplies] = useState(MOCK_REPLIES);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string>('developer-forum');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [isCreatingPost, setIsCreatingPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [replyContent, setReplyContent] = useState('');

  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const newPostFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);

  // Chat channel state
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>(INITIAL_CHAT_MESSAGES);
  const [chatInput, setChatInput] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Forum filter
  const [showUnresolvedOnly, setShowUnresolvedOnly] = useState(false);

  // Auto-scroll chat to bottom when channel changes or messages update
  useEffect(() => {
    if (CHAT_CHANNELS.has(activeChannel) && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [activeChannel, chatMessages]);

  // Fetch posts and replies from API on mount, fallback to mock data
  const fetchPosts = useCallback(async () => {
    try {
      const res = await fetch('/api/forum/posts?limit=50');
      if (res.ok) {
        const data = await res.json();
        if (data.posts && data.posts.length > 0) {
          // Map API response to component format
          setPosts(data.posts.map((p: Record<string, unknown>) => ({
            id: p.postId as string,
            channelId: (p.channelId as string) || 'developer-forum',
            title: p.title as string,
            content: p.content as string,
            author: p.author as string,
            replies: (p.replyCount as number) || 0,
            time: p.createdAt ? new Date(p.createdAt as string).toLocaleString() : 'Unknown',
            tags: (p.tags as string[]) || [],
            hasImage: (p.hasImage as boolean) || false,
            imageUrl: p.imageUrl as string | undefined,
            resolved: (p.resolved as boolean) || false,
            source: p.source as string | undefined,
          })));
        }
      }
    } catch {
      // Fallback to INITIAL_POSTS (already set as default state)
    }
  }, []);

  const fetchReplies = useCallback(async () => {
    try {
      // Fetch all replies — in production this would be per-post
      const postIds = posts.map(p => p.id);
      const allReplies: Array<Record<string, unknown>> = [];
      for (const pid of postIds.slice(0, 12)) {
        const res = await fetch(`/api/forum/posts/${pid}/replies`);
        if (res.ok) {
          const data = await res.json();
          if (data.replies) allReplies.push(...data.replies);
        }
      }
      if (allReplies.length > 0) {
        setReplies(allReplies.map((r: Record<string, unknown>) => ({
          id: r.replyId as string,
          postId: r.postId as string,
          author: r.author as string,
          role: (r.role as string) || 'user',
          time: r.createdAt ? new Date(r.createdAt as string).toLocaleString() : 'Unknown',
          content: r.content as string,
          hasImage: (r.hasImage as boolean) || false,
          imageUrl: r.imageUrl as string | undefined,
        })));
      }
    } catch {
      // Fallback to MOCK_REPLIES
    }
  }, [posts]);

  useEffect(() => {
    // Seed forum data then fetch
    const init = async () => {
      try {
        await fetch('/api/forum/seed', { method: 'POST' });
      } catch { /* ignore seed errors */ }
      await fetchPosts();
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch replies after posts are loaded from API
  const postsLoadedRef = useRef(false);
  useEffect(() => {
    if (posts.length > 0 && posts[0].id !== '1' && !postsLoadedRef.current) {
      // Posts were loaded from API (not mock data)
      postsLoadedRef.current = true;
      fetchReplies();
    }
  }, [posts, fetchReplies]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string | null>>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setter(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChannelClick = (channelId: string) => {
    setActiveChannel(channelId);
    setSelectedPost(null);
    setShowCalendar(false);
    setIsScheduled(false);
    setIsCreatingPost(false);
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

  const handleCreatePost = async () => {
    if (!address) {
      signIn();
      return;
    }
    if (!newPostTitle.trim()) return;

    const authorName = address.substring(0, 6) + '...';
    const newPost = {
      id: `post-${Date.now()}`,
      channelId: activeChannel,
      title: newPostTitle,
      content: newPostContent,
      author: authorName,
      replies: 0,
      time: "Just now",
      tags: [],
      hasImage: !!newPostImage,
      imageUrl: newPostImage,
      resolved: false,
    };

    setPosts([newPost, ...posts]);
    setNewPostTitle('');
    setNewPostContent('');
    setNewPostImage(null);
    setIsCreatingPost(false);

    // Persist to API
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newPost.title,
          content: newPost.content,
          author: authorName,
          authorAddress: address,
          channelId: activeChannel,
          tags: [],
          hasImage: newPost.hasImage,
          imageUrl: newPost.imageUrl,
          source: 'web',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        // Update the local post with the real ID from the API
        setPosts(prev => prev.map(p => p.id === newPost.id ? { ...p, id: data.post.postId } : p));
      }
    } catch {
      // Post already added to local state as optimistic update
    }
  };

  const handleCreateReply = async (postId: string) => {
    if (!address) {
      signIn();
      return;
    }
    if (!replyContent.trim() && !replyImage) return;

    const authorName = address.substring(0, 6) + '...';
    const newReply = {
      id: `reply-${Date.now()}`,
      postId: postId,
      author: authorName,
      role: 'user',
      time: 'Just now',
      content: replyContent,
      hasImage: !!replyImage,
      imageUrl: replyImage,
    };

    setReplies([...replies, newReply]);
    setPosts(posts.map(p => p.id === postId ? { ...p, replies: p.replies + 1 } : p));
    setReplyContent('');
    setReplyImage(null);

    // Persist to API
    try {
      await fetch(`/api/forum/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author: authorName,
          authorAddress: address,
          role: 'user',
          content: newReply.content,
          hasImage: newReply.hasImage,
          imageUrl: newReply.imageUrl,
        }),
      });
    } catch {
      // Reply already added optimistically
    }
  };

  const handleToggleResolve = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    const newResolved = !post?.resolved;
    setPosts(posts.map(p => p.id === postId ? { ...p, resolved: newResolved } : p));

    // Persist to API
    try {
      await fetch(`/api/forum/posts/${postId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: newResolved }),
      });
    } catch {
      // Optimistic update already applied
    }
  };

  const handleSendChatMessage = () => {
    if (!chatInput.trim()) return;
    const authorName = address ? address.substring(0, 6) + '...' : 'you';
    const msg: ChatMessage = {
      id: `cm-${Date.now()}`,
      author: authorName,
      role: 'user',
      time: 'Just now',
      content: chatInput.trim(),
    };
    setChatMessages(prev => ({
      ...prev,
      [activeChannel]: [...(prev[activeChannel] ?? []), msg],
    }));
    setChatInput('');
  };

  const isChatChannel = CHAT_CHANNELS.has(activeChannel);

  const getChannelClass = (id: string, isForum: boolean = false) => {
    const baseClass = "flex items-center px-2 py-1.5 rounded cursor-pointer transition-colors";
    if (activeChannel === id) {
      return `${baseClass} bg-[#404249] text-white ring-1 ring-[#5865F2]`;
    }
    return `${baseClass} text-[#949BA4] hover:bg-[#3F4147] hover:text-[#DBDEE1]`;
  };

  return (
    <div className="flex h-full w-full bg-[#313338] text-[#DBDEE1] font-sans overflow-hidden relative">
      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div 
          className="absolute inset-0 bg-black/50 z-20 md:hidden" 
          onClick={() => setShowSidebar(false)} 
        />
      )}

      {/* Server Sidebar */}
      <div className={`${showSidebar ? 'flex absolute inset-y-0 left-0 z-30 shadow-2xl' : 'hidden'} md:flex md:static w-[240px] bg-[#2B2D31] flex-shrink-0 flex-col border-r border-[#1E1F22]/50 transition-transform`}>
        {/* Server Header */}
        <div className="h-12 flex items-center px-4 border-b border-[#1E1F22] hover:bg-[#3F4147] cursor-pointer transition-colors shrink-0">
          <div className="flex items-center gap-2 flex-1 font-semibold text-white">
            <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            Base
          </div>
          <ChevronDown className="w-4 h-4 text-[#949BA4]" />
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-[2px] custom-scrollbar">
          <div className="mt-4 mb-1 px-2 flex items-center text-xs font-semibold text-[#949BA4] hover:text-[#DBDEE1] cursor-pointer uppercase tracking-wider">
            <ChevronDown className="w-3 h-3 mr-1" />
            Base Developers
          </div>

          <div className="flex flex-col">
            <div 
              onClick={() => handleChannelClick('developer-forum')}
              className={getChannelClass('developer-forum', true)}
            >
              <MessageSquare className="w-5 h-5 mr-1.5 text-[#949BA4]" />
              <span className="flex-1 font-medium truncate">developer-forum</span>
              <Users className="w-4 h-4 text-[#949BA4]" />
            </div>
            
            {/* Threads */}
            {activeChannel === 'developer-forum' && (
              <div className="ml-6 pl-2 border-l border-[#4E5058] flex flex-col gap-[2px] mt-[2px]">
                {posts.filter(p => p.channelId === 'developer-forum').map(thread => (
                  <div 
                    key={thread.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleChannelClick('developer-forum');
                      setSelectedPost(thread.id);
                    }}
                    className={`px-2 py-1 rounded cursor-pointer truncate text-sm ${selectedPost === thread.id ? 'bg-[#404249] text-white' : 'text-[#949BA4] hover:bg-[#3F4147] hover:text-[#DBDEE1]'}`}
                  >
                    {thread.title}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-2 space-y-[2px]">
            <div 
              onClick={() => handleChannelClick('developer-chat')}
              className={getChannelClass('developer-chat')}
            >
              <span className="mr-1.5 text-blue-500">🔵</span>
              <span className="flex-1 truncate">| developer-chat</span>
            </div>
            <div 
              onClick={() => handleChannelClick('node-operators')}
              className={getChannelClass('node-operators')}
            >
              <span className="mr-1.5">🛠️</span>
              <span className="flex-1 truncate">| node-operators</span>
            </div>
            <div 
              onClick={() => handleChannelClick('mini-apps')}
              className={getChannelClass('mini-apps')}
            >
              <span className="mr-1.5">🛠️</span>
              <span className="flex-1 truncate">| mini-apps</span>
            </div>
            <div 
              onClick={() => handleChannelClick('base-build')}
              className={getChannelClass('base-build')}
            >
              <span className="mr-1.5 text-blue-600">🟦</span>
              <span className="flex-1 truncate">| base-build</span>
            </div>
            <div 
              onClick={() => handleChannelClick('ai-agents')}
              className={getChannelClass('ai-agents')}
            >
              <span className="mr-1.5">🤖</span>
              <span className="flex-1 truncate">| ai-agents</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Forum Area */}
      <div className={`flex-1 flex-col min-w-0 bg-[#313338] ${selectedPost ? 'hidden' : 'flex'}`}>
        {/* Header */}
        <div className="h-12 flex items-center px-4 border-b border-[#1E1F22] shadow-sm shrink-0">
          <button 
            className="md:hidden mr-3 text-[#949BA4] hover:text-[#DBDEE1]"
            onClick={() => setShowSidebar(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <MessageSquare className="w-6 h-6 text-[#80848E] mr-2 hidden sm:block" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-white truncate">{activeChannel}</h3>
            {isChatChannel && CHANNEL_DESCRIPTIONS[activeChannel] && (
              <p className="text-xs text-[#949BA4] truncate hidden sm:block">{CHANNEL_DESCRIPTIONS[activeChannel]}</p>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-[#B5BAC1]">
            <BellOff className="w-5 h-5 cursor-pointer hover:text-[#DBDEE1] hidden sm:block" />
            <Users className="w-5 h-5 cursor-pointer hover:text-[#DBDEE1] hidden sm:block" />
            <div className="relative">
              <input 
                type="text" 
                placeholder="Search Base" 
                className="bg-[#1E1F22] text-sm rounded px-2 py-1 w-24 sm:w-36 focus:w-32 sm:focus:w-48 transition-all outline-none placeholder-[#949BA4]"
              />
              <Search className="w-4 h-4 absolute right-2 top-1.5 text-[#949BA4]" />
            </div>
          </div>
        </div>

        {/* Content: Chat or Forum */}
        {isChatChannel ? (
          <>
            {/* Chat Messages */}
            <div ref={chatScrollRef} className="flex-1 overflow-y-auto px-4 pt-4 custom-scrollbar flex flex-col scroll-smooth">
              {(chatMessages[activeChannel] ?? []).map((msg, i, arr) => {
                const prev = arr[i - 1];
                const grouped = !!(prev && prev.author === msg.author);
                return (
                  <div key={msg.id} className={`flex items-start gap-3 hover:bg-[#2E3035] -mx-4 px-4 py-0.5 transition-colors ${!grouped ? 'mt-5' : ''}`}>
                    {!grouped ? (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${msg.role === 'admin' ? 'bg-emerald-500' : 'bg-[#5865F2]'}`}>
                        {msg.author.charAt(0).toUpperCase()}
                      </div>
                    ) : (
                      <div className="w-10 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      {!grouped && (
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className={`font-medium ${msg.role === 'admin' ? 'text-emerald-400' : 'text-white'}`}>{msg.author}</span>
                          {msg.role === 'admin' && <span className="bg-[#5865F2] text-white text-[10px] px-1 rounded uppercase font-bold ml-0.5">Admin</span>}
                          <span className="text-xs text-[#949BA4]">{msg.time}</span>
                        </div>
                      )}
                      <p className="text-[#DBDEE1] text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div className="h-4 shrink-0" />
            </div>

            {/* Chat Input */}
            <div className="px-4 pb-4 shrink-0">
              <div className="bg-[#383A40] rounded-lg p-2 flex items-center gap-2">
                <button
                  className="w-8 h-8 rounded-full bg-[#404249] hover:bg-[#4E5058] flex items-center justify-center text-[#DBDEE1] shrink-0"
                  title="Add attachment"
                >
                  <Plus className="w-5 h-5" />
                </button>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      if (!address) { signIn(); return; }
                      handleSendChatMessage();
                    }
                  }}
                  placeholder={`Message #${activeChannel}`}
                  className="bg-transparent border-none outline-none flex-1 text-[#DBDEE1] placeholder-[#949BA4] text-sm"
                />
                <button
                  onClick={() => { if (!address) { signIn(); return; } handleSendChatMessage(); }}
                  disabled={!chatInput.trim()}
                  className="w-8 h-8 rounded-full bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#404249] disabled:text-[#949BA4] flex items-center justify-center text-white shrink-0 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Forum Content */
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4 scroll-smooth">
            {/* Search/Create Post */}
            <div className="bg-[#2B2D31] rounded-lg p-3 flex flex-col gap-3 border border-[#1E1F22]/50">
              {isCreatingPost ? (
                <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
                  <input
                    type="text"
                    placeholder="Post Title"
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                    className="bg-[#1E1F22] border border-[#1E1F22] rounded p-2 text-[#DBDEE1] placeholder-[#949BA4] outline-none focus:border-[#5865F2] transition-colors"
                  />
                  <textarea
                    placeholder="What's on your mind?"
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    className="bg-[#1E1F22] border border-[#1E1F22] rounded p-2 text-[#DBDEE1] placeholder-[#949BA4] outline-none focus:border-[#5865F2] transition-colors min-h-[100px] resize-y"
                  />
                  {newPostImage && (
                    <div className="relative inline-block w-32 h-32 rounded-lg overflow-hidden border border-[#1E1F22]">
                      <Image src={newPostImage} alt="Upload preview" fill className="object-cover" referrerPolicy="no-referrer" />
                      <button
                        onClick={() => setNewPostImage(null)}
                        className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => newPostFileInputRef.current?.click()}
                        className="w-8 h-8 rounded-full bg-[#383A40] hover:bg-[#404249] flex items-center justify-center text-[#DBDEE1] shrink-0"
                        title="Upload Image"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={newPostFileInputRef}
                        onChange={(e) => handleImageUpload(e, setNewPostImage)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsCreatingPost(false)}
                        className="text-[#949BA4] hover:text-[#DBDEE1] px-3 py-1.5 rounded font-medium transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleCreatePost}
                        disabled={!newPostTitle.trim()}
                        className="bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#3F4147] disabled:text-[#949BA4] text-white px-4 py-1.5 rounded font-medium flex items-center justify-center gap-2 transition-colors"
                      >
                        Post
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
                  <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                    <button
                      onClick={() => newPostFileInputRef.current?.click()}
                      className="w-8 h-8 rounded-full bg-[#383A40] hover:bg-[#404249] flex items-center justify-center text-[#DBDEE1] shrink-0"
                      title="Upload Image"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={newPostFileInputRef}
                      onChange={(e) => {
                        handleImageUpload(e, setNewPostImage);
                        setIsCreatingPost(true);
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Search or create a post..."
                      onFocus={() => setIsCreatingPost(true)}
                      className="bg-transparent border-none outline-none flex-1 text-[#DBDEE1] placeholder-[#949BA4] text-base sm:text-lg w-full"
                    />
                  </div>
                  <button
                    onClick={() => setIsCreatingPost(true)}
                    className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-1.5 rounded font-medium flex items-center justify-center gap-2 transition-colors w-full sm:w-auto mt-2 sm:mt-0"
                  >
                    <MessageSquare className="w-4 h-4" />
                    New Post
                  </button>
                </div>
              )}
            </div>

            {/* Tags Row */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
              <button
                onClick={() => setShowUnresolvedOnly(v => !v)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border whitespace-nowrap transition-colors ${
                  showUnresolvedOnly
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-[#2B2D31] hover:bg-[#3F4147] text-[#DBDEE1] border-[#1E1F22]/50'
                }`}
              >
                Unresolved
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 bg-[#2B2D31] hover:bg-[#3F4147] rounded-lg text-sm font-medium text-[#DBDEE1] border border-[#1E1F22]/50 whitespace-nowrap">
                <span className="text-[#949BA4]">↑↓</span> Sort & View <ChevronDown className="w-4 h-4 ml-1" />
              </button>
              <div className="w-px h-6 bg-[#4E5058] mx-1 shrink-0" />
              {TAGS.map(tag => (
                <button key={tag} className="px-3 py-1.5 bg-[#2B2D31] hover:bg-[#3F4147] rounded-lg text-sm font-medium text-[#DBDEE1] border border-[#1E1F22]/50 whitespace-nowrap">
                  {tag}
                </button>
              ))}
            </div>

            {/* Posts List */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {posts
                .filter(p => p.channelId === activeChannel)
                .filter(p => (p as any).source !== 'telegram' || isTelegramConnected)
                .filter(p => !showUnresolvedOnly || !p.resolved)
                .map(post => (
                  <div
                    key={post.id}
                    onClick={() => setSelectedPost(post.id)}
                    className={`bg-[#2B2D31] hover:bg-[#2E3035] border border-[#1E1F22]/50 rounded-xl p-4 cursor-pointer transition-colors flex flex-col gap-3 ${selectedPost === post.id ? 'ring-1 ring-[#5865F2]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <h4 className="text-base font-semibold text-[#DBDEE1] leading-snug line-clamp-2 flex items-start gap-2">
                        {post.resolved && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                        {(post as any).source === 'telegram' && (
                          <MessageCircle className="w-4 h-4 text-[#229ED9] shrink-0 mt-0.5" />
                        )}
                        {post.title}
                      </h4>
                      {post.hasImage && (
                        <div className="relative w-16 h-16 bg-[#1E1F22] rounded-lg border border-[#1E1F22]/50 flex-shrink-0 overflow-hidden mt-2">
                          <Image src={(post as any).imageUrl || `https://picsum.photos/seed/${post.id}/100/100`} alt="Post thumbnail" fill className="object-cover opacity-80" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </div>

                    {post.tags.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap">
                        {post.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-[#1E1F22] text-[#DBDEE1] rounded text-xs font-semibold">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-3 border-t border-[#1E1F22]/50">
                      <div className="flex items-center gap-2 text-xs text-[#949BA4]">
                        <div className="w-5 h-5 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                          {post.author.charAt(0)}
                        </div>
                        <span className="font-medium hover:underline text-[#DBDEE1]">{post.author}</span>
                        <span>•</span>
                        <span>{post.time}</span>
                      </div>
                      <div className="flex items-center gap-3 text-[#949BA4] text-xs font-medium">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="w-4 h-4" />
                          {post.replies}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const context = `Thread Title: ${post.title}\nAuthor: ${post.author}\nContent: ${post.content}`;
                            onStartCall?.(post.title, context);
                          }}
                          className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded transition-colors flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3" />
                          Call
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              {posts.filter(p => p.channelId === activeChannel).length === 0 && (
                <div className="col-span-full text-center text-[#949BA4] py-12">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                  <p>No posts in this channel yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel (Issue Details) */}
      {selectedPost && (
        <div className="flex-1 min-w-0 bg-[#313338] border-l border-[#1E1F22] flex flex-col">
          <div className="h-12 flex items-center justify-between px-4 border-b border-[#1E1F22] shrink-0 bg-[#313338]">
            <div className="flex items-center gap-2 overflow-hidden">
              <button 
                onClick={() => { setSelectedPost(null); setShowCalendar(false); setIsScheduled(false); }} 
                className="lg:hidden text-[#949BA4] hover:text-[#DBDEE1] mr-1 shrink-0"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h3 className="font-semibold text-white truncate">Thread Details</h3>
            </div>
            <div className="flex items-center gap-2 text-[#B5BAC1] shrink-0">
              <button 
                onClick={() => setShowCalendar(!showCalendar)}
                className="text-xs font-medium bg-[#2B2D31] hover:bg-[#3F4147] text-[#DBDEE1] py-1.5 px-3 rounded transition-colors flex items-center gap-1.5 border border-[#1E1F22]"
                title="Schedule Call"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Schedule</span>
              </button>
              <button 
                onClick={() => {
                  const post = posts.find(p => p.id === selectedPost);
                  if (post) {
                    const context = `Thread Title: ${post.title}\nAuthor: ${post.author}\nContent: ${post.content}`;
                    onStartCall?.(post.title, context);
                  }
                }}
                className="text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white py-1.5 px-3 rounded transition-colors flex items-center gap-1.5"
                title="Call DevRel"
              >
                <Phone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Call</span>
              </button>
              <button
                onClick={() => onNavigateToRepair?.()}
                className="text-xs font-medium bg-orange-500/15 hover:bg-orange-500/25 text-orange-400 py-1.5 px-3 rounded transition-colors flex items-center gap-1.5 border border-orange-500/20"
                title="Go to Repair"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Repair</span>
              </button>
              <div className="w-px h-4 bg-[#4E5058] mx-1"></div>
              <button 
                onClick={() => handleToggleResolve(selectedPost)}
                className={`text-xs font-medium py-1.5 px-3 rounded transition-colors ${posts.find(p => p.id === selectedPost)?.resolved ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-[#5865F2]/10 text-[#5865F2] hover:bg-[#5865F2]/20'}`}
              >
                {posts.find(p => p.id === selectedPost)?.resolved ? 'Resolved' : 'Resolve'}
              </button>
              <button onClick={() => { setSelectedPost(null); setShowCalendar(false); setIsScheduled(false); }} className="hover:text-[#DBDEE1] hidden lg:block ml-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-0 custom-scrollbar flex flex-col">
            {(() => {
              const post = posts.find(p => p.id === selectedPost);
              if (!post) return null;
              return (
                <>
                  {showCalendar && !isScheduled && (
                    <div className="p-4 border-b border-[#1E1F22] bg-[#313338]">
                      <div className="bg-[#2B2D31] rounded-xl border border-[#1E1F22]/50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <h4 className="text-white font-medium mb-4 flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-indigo-400" />
                          Select Date & Time
                        </h4>
                        
                        {/* Simple Calendar Grid */}
                        <div className="mb-4">
                          <div className="flex justify-between items-center mb-2 text-sm">
                            <span className="text-white font-medium">March 2026</span>
                            <div className="flex gap-2">
                              <button className="text-[#949BA4] hover:text-white"><ChevronDown className="w-4 h-4 rotate-90" /></button>
                              <button className="text-[#949BA4] hover:text-white"><ChevronDown className="w-4 h-4 -rotate-90" /></button>
                            </div>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1 text-[#949BA4]">
                            <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                          </div>
                          <div className="grid grid-cols-7 gap-1 text-sm">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                              <button
                                key={day}
                                onClick={() => setSelectedDate(day)}
                                className={`aspect-square rounded flex items-center justify-center transition-colors ${
                                  selectedDate === day 
                                    ? 'bg-indigo-500 text-white font-bold' 
                                    : 'text-[#DBDEE1] hover:bg-[#3F4147]'
                                }`}
                              >
                                {day}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Time Slots */}
                        {selectedDate && (
                          <div className="mb-4 animate-in fade-in duration-200">
                            <h5 className="text-xs font-semibold text-[#949BA4] uppercase mb-2 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Available Times
                            </h5>
                            <div className="grid grid-cols-3 gap-2">
                              {['10:00 AM', '11:30 AM', '1:00 PM', '2:30 PM', '4:00 PM', '5:30 PM'].map(time => (
                                <button
                                  key={time}
                                  onClick={() => setSelectedTime(time)}
                                  className={`py-1.5 rounded text-xs font-medium transition-colors border ${
                                    selectedTime === time
                                      ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                                      : 'bg-[#1E1F22] border-[#1E1F22] text-[#DBDEE1] hover:border-[#4E5058]'
                                  }`}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        <button 
                          disabled={!selectedDate || !selectedTime}
                          onClick={() => setIsScheduled(true)}
                          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-[#3F4147] disabled:text-[#949BA4] text-white py-2 rounded font-medium transition-colors"
                        >
                          Confirm Schedule
                        </button>
                      </div>
                    </div>
                  )}

                  {isScheduled && (
                    <div className="p-4 border-b border-[#1E1F22] bg-[#313338]">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 animate-in zoom-in-95 duration-200">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h4 className="text-emerald-400 font-medium">Call Scheduled!</h4>
                        <p className="text-sm text-emerald-400/80">
                          A DevRel will call you on March {selectedDate} at {selectedTime}.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Original Post */}
                  <div className="p-4 border-b border-[#1E1F22] bg-[#2B2D31]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold shrink-0">
                        {post.author.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-white font-medium hover:underline cursor-pointer">{post.author}</span>
                          <span className="text-xs text-[#949BA4]">{post.time}</span>
                          {(post as any).source === 'telegram' && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-[#229ED9] bg-[#229ED9]/10 px-1.5 py-0.5 rounded">
                              <MessageCircle className="w-3 h-3" />
                              Telegram
                            </span>
                          )}
                        </div>
                        <h2 className="text-lg font-bold text-white mt-1 mb-2 leading-snug">{post.title}</h2>
                        <div className="text-[#DBDEE1] text-sm leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </div>
                        {post.hasImage && (
                          <div className="mt-3 relative w-full max-w-sm h-48 bg-[#1E1F22] rounded-lg border border-[#1E1F22]/50 overflow-hidden">
                            <Image src={(post as any).imageUrl || `https://picsum.photos/seed/${post.id}/400/300`} alt="Post image" fill className="object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  <div className="flex-1 p-4 flex flex-col gap-4">
                    {replies.filter(r => r.postId === post.id || !r.postId).map(reply => (
                      <div key={reply.id} className="flex items-start gap-3 hover:bg-[#2E3035] -mx-4 px-4 py-1 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${reply.role === 'admin' ? 'bg-emerald-500' : 'bg-[#5865F2]'}`}>
                          {reply.author.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className={`font-medium hover:underline cursor-pointer ${reply.role === 'admin' ? 'text-emerald-400' : 'text-white'}`}>{reply.author}</span>
                            {reply.role === 'admin' && <span className="bg-[#5865F2] text-white text-[10px] px-1 rounded uppercase font-bold ml-1">Admin</span>}
                            <span className="text-xs text-[#949BA4] ml-1">{reply.time}</span>
                          </div>
                          <div className="text-[#DBDEE1] text-sm leading-relaxed mt-0.5 whitespace-pre-wrap">
                            {reply.content}
                          </div>
                          {reply.hasImage && (
                            <div className="mt-2 relative w-48 h-32 bg-[#1E1F22] rounded-lg border border-[#1E1F22]/50 overflow-hidden">
                              <Image src={(reply as any).imageUrl || `https://picsum.photos/seed/${reply.id}/200/150`} alt="Reply image" fill className="object-cover" referrerPolicy="no-referrer" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons & Reply Input */}
                  <div className="p-4 bg-[#313338] mt-auto shrink-0 border-t border-[#1E1F22]">
                    <div className="flex flex-col gap-3">
                      {replyImage && (
                        <div className="relative inline-block w-32 h-32 rounded-lg overflow-hidden border border-[#1E1F22]">
                          <Image src={replyImage} alt="Upload preview" fill className="object-cover" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => setReplyImage(null)}
                            className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-1"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <div className="bg-[#383A40] rounded-lg p-2 flex items-center gap-2">
                        <button 
                          onClick={() => replyFileInputRef.current?.click()}
                          className="w-8 h-8 rounded-full bg-[#404249] hover:bg-[#4E5058] flex items-center justify-center text-[#DBDEE1] shrink-0"
                          title="Upload Image"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          ref={replyFileInputRef}
                          onChange={(e) => handleImageUpload(e, setReplyImage)}
                        />
                        <input 
                          type="text" 
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleCreateReply(post.id);
                            }
                          }}
                          placeholder={`Message in ${post.title}`} 
                          className="bg-transparent border-none outline-none flex-1 text-[#DBDEE1] placeholder-[#949BA4] text-sm"
                        />
                        <button 
                          onClick={() => handleCreateReply(post.id)}
                          disabled={!replyContent.trim() && !replyImage}
                          className="w-8 h-8 rounded-full bg-[#5865F2] hover:bg-[#4752C4] disabled:bg-[#404249] disabled:text-[#949BA4] flex items-center justify-center text-white shrink-0 transition-colors"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
