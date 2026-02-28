import React, { useState, useRef } from 'react';
import Image from 'next/image';
import { Hash, Search, ChevronDown, BellOff, Users, MessageSquare, Plus, MoreHorizontal, Menu, X, Phone, Calendar, Clock, CheckCircle2 } from 'lucide-react';

const MOCK_POSTS = [
  { id: '1', channelId: 'developer-forum', title: "Why won't my link to the game open? I get this error message.Please wait while we verify your identi", author: "Ruslan S.", replies: 12, time: "1m ago", tags: ["Mini Apps"], hasImage: true },
  { id: '2', channelId: 'developer-forum', title: "base.dev - something went wrong", author: "kieran", replies: 36, time: "4m ago", tags: [], hasImage: false },
  { id: '3', channelId: 'developer-forum', title: "My mini apps domain issues.", author: "TrailBlazer", replies: 40, time: "11m ago", tags: [], hasImage: true },
  { id: 'thread-1', channelId: 'developer-forum', title: "Can't sign into base.dev with my wallet", author: "0xAlice", replies: 5, time: "1h ago", tags: ["Base Account"], hasImage: false },
  { id: 'thread-2', channelId: 'developer-forum', title: "Maxshot Mini App Not Showing in Bas...", author: "Bob.eth", replies: 2, time: "2h ago", tags: ["Mini Apps"], hasImage: false },
  { id: 'thread-3', channelId: 'developer-forum', title: "PathDB geth snapshot?", author: "Charlie", replies: 8, time: "3h ago", tags: ["Node"], hasImage: false },
  { id: 'thread-4', channelId: 'developer-forum', title: "Domain migration", author: "Dave", replies: 15, time: "4h ago", tags: [], hasImage: false },
  { id: 'thread-5', channelId: 'developer-forum', title: "Suggestion: Change Flashblocks to 40...", author: "Eve", replies: 22, time: "5h ago", tags: ["Feedback"], hasImage: false },
  { id: 'chat-1', channelId: 'developer-chat', title: "GM builders! What are you working on today?", author: "Jesse", replies: 104, time: "1h ago", tags: [], hasImage: false },
  { id: 'node-1', channelId: 'node-operators', title: "Node sync stuck at block 1420593", author: "NodeRunner", replies: 3, time: "5m ago", tags: ["Bug Report"], hasImage: true },
  { id: 'mini-1', channelId: 'mini-apps', title: "Best practices for mini app routing?", author: "FrontendDev", replies: 7, time: "20m ago", tags: ["Question"], hasImage: false },
  { id: 'build-1', channelId: 'base-build', title: "Base Build Season 2 updates", author: "BaseTeam", replies: 45, time: "1d ago", tags: ["Discussion"], hasImage: true },
  { id: 'ai-1', channelId: 'ai-agents', title: "Integrating CDP AgentKit with Discord", author: "AI_Dev", replies: 12, time: "2h ago", tags: ["AI Agents"], hasImage: false },
];

const SIDEBAR_THREADS = [
  { id: 'thread-1', title: "Can't sign into base.dev with my wallet" },
  { id: 'thread-2', title: "Maxshot Mini App Not Showing in Bas..." },
  { id: 'thread-3', title: "PathDB geth snapshot?" },
  { id: '2', title: "base.dev - something went wrong" },
  { id: 'thread-4', title: "Domain migration" },
  { id: 'thread-5', title: "Suggestion: Change Flashblocks to 40..." },
];

const MOCK_REPLIES = [
  { id: 'r1', author: 'BaseTeam', role: 'admin', time: '10m ago', content: 'We are looking into this issue. Can you provide your wallet address?' },
  { id: 'r2', author: '0xAlice', role: 'user', time: '5m ago', content: 'Sure, it is 0x1234...5678' },
];

const TAGS = ['Node', 'Base Account', 'Onchain Kit', 'Mini Apps', 'AI Agents', 'Feedback', 'Bug Report', 'Question', 'Discussion'];

interface DiscordViewProps {
  onStartCall?: (title: string, context?: string) => void;
}

export function DiscordView({ onStartCall }: DiscordViewProps) {
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string>('developer-forum');
  const scrollRef = useRef<HTMLDivElement>(null);

  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const newPostFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);

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
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

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
                {SIDEBAR_THREADS.map(thread => (
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
      <div className={`flex-1 flex-col min-w-0 bg-[#313338] ${selectedPost ? 'hidden lg:flex' : 'flex'}`}>
        {/* Header */}
        <div className="h-12 flex items-center px-4 border-b border-[#1E1F22] shadow-sm shrink-0">
          <button 
            className="md:hidden mr-3 text-[#949BA4] hover:text-[#DBDEE1]"
            onClick={() => setShowSidebar(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
          <MessageSquare className="w-6 h-6 text-[#80848E] mr-2 hidden sm:block" />
          <h3 className="font-semibold text-white flex-1 truncate">{activeChannel}</h3>
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

        {/* Forum Content */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4 scroll-smooth">
          {/* Search/Create Post */}
          <div className="bg-[#2B2D31] rounded-lg p-3 flex flex-col gap-3 border border-[#1E1F22]/50">
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
                  onChange={(e) => handleImageUpload(e, setNewPostImage)}
                />
                <input 
                  type="text" 
                  placeholder="Search or create a post..." 
                  className="bg-transparent border-none outline-none flex-1 text-[#DBDEE1] placeholder-[#949BA4] text-base sm:text-lg w-full"
                />
              </div>
              <button className="bg-[#5865F2] hover:bg-[#4752C4] text-white px-4 py-1.5 rounded font-medium flex items-center justify-center gap-2 transition-colors w-full sm:w-auto mt-2 sm:mt-0">
                <MessageSquare className="w-4 h-4" />
                New Post
              </button>
            </div>
          </div>

          {/* Tags Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
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
            {MOCK_POSTS.filter(p => p.channelId === activeChannel).map(post => (
              <div 
                key={post.id}
                onClick={() => setSelectedPost(post.id)}
                className={`bg-[#2B2D31] hover:bg-[#2E3035] border border-[#1E1F22]/50 rounded-xl p-4 cursor-pointer transition-colors flex flex-col gap-3 ${selectedPost === post.id ? 'ring-1 ring-[#5865F2]' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <h4 className="text-base font-semibold text-[#DBDEE1] leading-snug line-clamp-2">
                    {post.title}
                  </h4>
                  {post.hasImage && (
                    <div className="relative w-16 h-16 bg-[#1E1F22] rounded-lg border border-[#1E1F22]/50 flex-shrink-0 overflow-hidden">
                      <Image src={`https://picsum.photos/seed/${post.id}/100/100`} alt="Post thumbnail" fill className="object-cover opacity-80" referrerPolicy="no-referrer" />
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
                        const context = `Thread Title: ${post.title}\nAuthor: ${post.author}\nContent: I'm having trouble with my application on base.dev. When I try to access the link, it throws an error and asks me to verify my identity, but the verification process never completes.\nLogs:\nError: Verification timeout at 30000ms\nat Object.verifyIdentity (/app/src/auth.ts:42:15)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)`;
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
            {MOCK_POSTS.filter(p => p.channelId === activeChannel).length === 0 && (
              <div className="col-span-full text-center text-[#949BA4] py-12">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No posts in this channel yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel (Issue Details) */}
      {selectedPost && (
        <div className="w-full lg:w-[400px] bg-[#313338] border-l border-[#1E1F22] flex flex-col flex-shrink-0 shadow-2xl z-10 absolute inset-0 lg:static">
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
            <div className="flex items-center gap-3 text-[#B5BAC1] shrink-0">
              <button className="hover:text-[#DBDEE1] text-sm font-medium text-[#5865F2]">Resolve</button>
              <button onClick={() => { setSelectedPost(null); setShowCalendar(false); setIsScheduled(false); }} className="hover:text-[#DBDEE1] hidden lg:block">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-0 custom-scrollbar flex flex-col">
            {(() => {
              const post = MOCK_POSTS.find(p => p.id === selectedPost);
              if (!post) return null;
              return (
                <>
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
                        </div>
                        <h2 className="text-lg font-bold text-white mt-1 mb-2 leading-snug">{post.title}</h2>
                        <div className="text-[#DBDEE1] text-sm leading-relaxed">
                          <p>I'm having trouble with my application on base.dev. When I try to access the link, it throws an error and asks me to verify my identity, but the verification process never completes.</p>
                          <p className="mt-4">Has anyone else experienced this issue recently? Here are my logs:</p>
                          <pre className="mt-2 bg-[#1E1F22] p-3 rounded border border-[#1E1F22] font-mono text-xs text-[#949BA4] overflow-x-auto">
                            <code>
                              Error: Verification timeout at 30000ms{'\n'}
                              at Object.verifyIdentity (/app/src/auth.ts:42:15){'\n'}
                              at processTicksAndRejections (node:internal/process/task_queues:95:5)
                            </code>
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  <div className="flex-1 p-4 flex flex-col gap-4">
                    {MOCK_REPLIES.map(reply => (
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
                          <div className="text-[#DBDEE1] text-sm leading-relaxed mt-0.5">
                            {reply.content}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons & Reply Input */}
                  <div className="p-4 bg-[#313338] mt-auto shrink-0 border-t border-[#1E1F22]">
                    <div className="flex flex-col sm:flex-row items-center gap-2 mb-4">
                      <button 
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="w-full sm:flex-1 bg-[#2B2D31] hover:bg-[#3F4147] text-[#DBDEE1] py-2 rounded font-medium transition-colors flex items-center justify-center gap-2 border border-[#1E1F22]"
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule Call
                      </button>
                      <button 
                        onClick={() => {
                          const context = `Thread Title: ${post.title}\nAuthor: ${post.author}\nContent: I'm having trouble with my application on base.dev. When I try to access the link, it throws an error and asks me to verify my identity, but the verification process never completes.\nLogs:\nError: Verification timeout at 30000ms\nat Object.verifyIdentity (/app/src/auth.ts:42:15)\nat processTicksAndRejections (node:internal/process/task_queues:95:5)`;
                          onStartCall?.(post.title, context);
                        }}
                        className="w-full sm:flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Phone className="w-4 h-4" />
                        Call DevRel
                      </button>
                    </div>

                    {showCalendar && !isScheduled && (
                      <div className="bg-[#2B2D31] rounded-xl border border-[#1E1F22]/50 p-4 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
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
                    )}

                    {isScheduled && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-4 flex flex-col items-center justify-center text-center gap-2 animate-in zoom-in-95 duration-200">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-1">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <h4 className="text-emerald-400 font-medium">Call Scheduled!</h4>
                        <p className="text-sm text-emerald-400/80">
                          A DevRel will call you on March {selectedDate} at {selectedTime}.
                        </p>
                      </div>
                    )}

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
                          placeholder={`Message in ${post.title}`} 
                          className="bg-transparent border-none outline-none flex-1 text-[#DBDEE1] placeholder-[#949BA4] text-sm"
                        />
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
