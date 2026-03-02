import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import ForumPost from '@/models/ForumPost';
import ForumReply from '@/models/ForumReply';

// Seed data — mirrors INITIAL_POSTS and MOCK_REPLIES from DiscordView
const SEED_POSTS = [
  { postId: '1', channelId: 'developer-forum', title: 'App data displayed incorrectly in "Pinned apps"', content: 'I\'m launching my mini app "Squadletics" on Base app but I encountered an issue...', author: 'Linas | true.eth', replyCount: 7, tags: ['Mini Apps', 'Bug Report'], hasImage: true, resolved: false, source: 'discord' },
  { postId: '2', channelId: 'developer-forum', title: 'is the "mini app" concept still supported by base app?', content: 'now that farcaster is going away, is the mini app going to be removed from base app?', author: 'vDan', replyCount: 3, tags: ['Mini Apps', 'Question'], hasImage: false, resolved: true, source: 'discord' },
  { postId: '3', channelId: 'developer-forum', title: 'base.dev - something went wrong', content: 'looking for info regarding an error registering apps on base.dev', author: 'kieran', replyCount: 5, tags: ['Bug Report'], hasImage: false, resolved: false, source: 'discord' },
  { postId: '4', channelId: 'developer-forum', title: 'PathDB geth snapshot?', content: 'Hello everyone, I\'d like to know if there\'s a pathdb snapshot for geth available.', author: 'Lolmode', replyCount: 4, tags: ['Node'], hasImage: false, resolved: true, source: 'discord' },
  { postId: '5', channelId: 'developer-forum', title: 'Can\'t sign into base.dev with my wallet', content: 'After I keyed in my passphrase to log in into base.dev I\'m receiving the following error...', author: 'cell', replyCount: 8, tags: ['Base Account', 'Bug Report'], hasImage: false, resolved: false, source: 'discord' },
  { postId: '6', channelId: 'developer-forum', title: 'Why won\'t my link to the game open?', content: 'I\'m having trouble with my application on base.dev. The verification process never completes.', author: 'Ruslan S.', replyCount: 6, tags: ['Mini Apps'], hasImage: true, resolved: false, source: 'discord' },
  { postId: '7', channelId: 'developer-forum', title: 'How to Get OBN Token Listed As An AppCoin', content: 'Recently, Base App added a new feature where coins can be labeled as AppCoins...', author: 'jack2163', replyCount: 3, tags: ['Question'], hasImage: false, resolved: false, source: 'discord' },
  { postId: '8', channelId: 'developer-forum', title: 'Proof of ownership doesn\'t work', content: 'Proof of ownership doesn\'t work, although everything seems to be correct', author: 'TokoGaz', replyCount: 5, tags: ['Bug Report'], hasImage: true, resolved: false, source: 'discord' },
  { postId: '9', channelId: 'developer-forum', title: 'Shipped my first dApp on Base — Shitcoin Graveyard', content: 'Just deployed my first project on Base and wanted to share.', author: 'bezdar`?', replyCount: 4, tags: ['Discussion'], hasImage: false, resolved: false, source: 'discord' },
  { postId: '10', channelId: 'developer-forum', title: 'base.dev something went wrong message, no matter what I try', content: 'I tried everything I know', author: 'Kurogane (黒鋼)', replyCount: 7, tags: ['Bug Report'], hasImage: true, resolved: false, source: 'discord' },
  { postId: 'tg1', channelId: 'developer-forum', title: 'Smart contract deployment failing with out of gas', content: 'Hey everyone, I am trying to deploy a new ERC20 contract but it keeps failing with out of gas error.', author: 'CryptoDev_TG', replyCount: 2, tags: ['Smart Contracts', 'Bug Report'], hasImage: false, resolved: false, source: 'telegram' },
  { postId: 'tg2', channelId: 'developer-forum', title: 'How to verify contract on Basescan?', content: 'I deployed my contract but having trouble verifying it on Basescan using Hardhat.', author: 'Web3Builder_TG', replyCount: 4, tags: ['Tooling', 'Question'], hasImage: false, resolved: true, source: 'telegram' },
];

const SEED_REPLIES = [
  { replyId: 'r1', postId: '1', author: 'Base | Sift AI Support Agent', role: 'admin', content: 'It appears you\'re experiencing issues with how your Mini App is displayed in the Base app\'s "My apps" list. To troubleshoot, consider validating your manifest...' },
  { replyId: 'r2', postId: '1', author: 'Linas | true.eth', role: 'user', content: '@Base | Sift AI Support Agent I\'ve done all these steps already, the issue persists' },
  { replyId: 'r3', postId: '1', author: 'stpn.base.eth', role: 'admin', content: 'Hey, sorry I overlooked this one somehow. @kacperrr0.base.eth, can you help with this one?' },
  { replyId: 'r4', postId: '1', author: 'Gugu', role: 'admin', content: 'Hi @Linas | true.eth - I\'ve looked at your app metadata on base.dev/preview and the images seem to have incorrect sizes.' },
  { replyId: 'r5', postId: '1', author: 'Linas | true.eth', role: 'user', content: 'You\'re right, just checked, and the icon is now the right size but the icon logo doesn\'t show in the pinned apps.' },
  { replyId: 'r6', postId: '1', author: 'Gugu', role: 'admin', content: 'According to the Base Docs, the manifest should be signed with your root domain. The iconUrl should be a 1024×1024px PNG.' },
  { replyId: 'r7', postId: '1', author: 'kacperrr0.base.eth', role: 'admin', content: 'I\'d use a subdomain instead and first try adding it as a new URL. Don\'t forget to sign your manifest using the new domain.' },
  { replyId: 'r8', postId: '2', author: 'Base | Sift AI Support Agent', role: 'admin', content: 'I\'m not able to confidently answer this question. @Based Advocate Lead can help you resolve this.' },
  { replyId: 'r9', postId: '2', author: 'vDan', role: 'user', content: 'Base Mini Apps will not go away, and will continue to be supported by Base.' },
  { replyId: 'r10', postId: '2', author: 'Gugu', role: 'admin', content: 'base.dev tracks your app\'s onchain analytics. Builder Codes are the mechanism for attribution.' },
  { replyId: 'r11', postId: '3', author: 'Base | Sift AI Support Agent', role: 'admin', content: 'To troubleshoot app registration errors on Base.dev, use the Preview tool to validate your manifest.' },
  { replyId: 'r12', postId: '3', author: 'kieran', role: 'user', content: 'it\'s set up correctly just getting literal error codes' },
  { replyId: 'r13', postId: '3', author: 'Xiaomao', role: 'admin', content: 'Your manifest is not signed and configured properly. It needs to be accessible at your-domain.com/.well-known/farcaster.json' },
  { replyId: 'r14', postId: '3', author: 'kieran', role: 'user', content: 'thanks I\'m gona give that a try. are you sure it\'s not because it was previously registered for a different app?' },
  { replyId: 'r15', postId: '3', author: 'Gugu', role: 'admin', content: 'If you previously verified with a different domain, you need to clear the old accountAssociation and re-verify.' },
  { replyId: 'r16', postId: '4', author: 'Base | Sift AI Support Agent', role: 'admin', content: 'Geth Archive Nodes are no longer supported via snapshots. For Archive functionality, please use Reth.' },
  { replyId: 'r17', postId: '4', author: 'Lolmode', role: 'user', content: 'I only need full node snapshot with state.scheme being \'path\'. Syncing from scratch will take forever.' },
  { replyId: 'r18', postId: '4', author: 'Gugu', role: 'admin', content: 'tagging @Jon Roethke and @kacperrr0.base.eth to respond to this thread' },
  { replyId: 'r19', postId: '4', author: 'Jon Roethke', role: 'admin', content: 'No, we do not provide an official Geth snapshot with pathdb. We recommend moving to Reth.' },
];

// POST /api/forum/seed — populate the database with initial forum data
export async function POST() {
  try {
    await dbConnect();

    // Check if already seeded
    const existingCount = await ForumPost.countDocuments();
    if (existingCount >= SEED_POSTS.length) {
      return NextResponse.json({
        ok: true,
        message: `Already seeded (${existingCount} posts exist)`,
        seeded: false,
      }, { status: 200 });
    }

    // Clear existing and seed fresh
    await ForumPost.deleteMany({});
    await ForumReply.deleteMany({});

    // Seed posts (with staggered timestamps so sorting works)
    const now = Date.now();
    const postDocs = SEED_POSTS.map((p, i) => ({
      ...p,
      createdAt: new Date(now - (SEED_POSTS.length - i) * 3600000), // 1 hour apart
      updatedAt: new Date(now - (SEED_POSTS.length - i) * 3600000),
    }));
    await ForumPost.insertMany(postDocs);

    // Seed replies
    const replyDocs = SEED_REPLIES.map((r, i) => ({
      ...r,
      hasImage: false,
      createdAt: new Date(now - (SEED_REPLIES.length - i) * 1800000), // 30 min apart
      updatedAt: new Date(now - (SEED_REPLIES.length - i) * 1800000),
    }));
    await ForumReply.insertMany(replyDocs);

    return NextResponse.json({
      ok: true,
      message: `Seeded ${postDocs.length} posts and ${replyDocs.length} replies`,
      seeded: true,
    }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/forum/seed]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
