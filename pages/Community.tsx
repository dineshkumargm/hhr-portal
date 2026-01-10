import React, { useState } from 'react';

interface Post {
    id: string;
    author: {
        name: string;
        role: string;
        avatar: string;
    };
    content: string;
    time: string;
    likes: number;
    comments: number;
    tags: string[];
}

interface Trend {
    id: string;
    tag: string;
    postsCount: string;
}

interface TopRecruiter {
    id: string;
    name: string;
    hires: number;
    avatar: string;
    company: string;
}

const MOCK_POSTS: Post[] = [
    {
        id: '1',
        author: {
            name: 'Sarah Jenkins',
            role: 'Senior Tech Recruiter @ Google',
            avatar: 'https://ui-avatars.com/api/?name=Sarah+Jenkins&background=0d33f2&color=fff',
        },
        content: "Just closed a Senior Frontend role in record time using AI-driven matching! The quality of candidates being surfaced is night and day compared to manual filtering. Anyone else seeing a huge jump in 'time-to-hire' efficiency lately? #AIHiring #TechRecruitment",
        time: '2 hours ago',
        likes: 245,
        comments: 18,
        tags: ['AIHiring', 'TechRecruitment'],
    },
    {
        id: '2',
        author: {
            name: 'Marcus Chen',
            role: 'Head of Talent @ Stripe',
            avatar: 'https://ui-avatars.com/api/?name=Marcus+Chen&background=00d1ff&color=fff',
        },
        content: "We're officially moving to a 'skills-first' hiring model for all engineering roles starting Q3. Less focus on university pedigree, more on verified project experience and technical assessments. Thoughts? #FutureOfWork #SkillsFirst",
        time: '5 hours ago',
        likes: 189,
        comments: 42,
        tags: ['FutureOfWork', 'SkillsFirst'],
    },
    {
        id: '3',
        author: {
            name: 'Elena Rodriguez',
            role: 'Talent Acquisition Partner @ Meta',
            avatar: 'https://ui-avatars.com/api/?name=Elena+Rodriguez&background=f20d85&color=fff',
        },
        content: "The balance of remote vs. hybrid is shifting again. We're seeing a 30% increase in candidate drop-off when roles require 3+ days in-office. Flexibility is still the #1 priority for top-tier talent in 2026. #RemoteWork #TalentTrends",
        time: '8 hours ago',
        likes: 512,
        comments: 86,
        tags: ['RemoteWork', 'TalentTrends'],
    }
];

const MOCK_TRENDS: Trend[] = [
    { id: '1', tag: '#AIHiring', postsCount: '12.4K' },
    { id: '2', tag: '#EthicalAI', postsCount: '8.2K' },
    { id: '3', tag: '#SkillsFirst', postsCount: '5.1K' },
    { id: '4', tag: '#RemoteRecruiting', postsCount: '3.9K' },
    { id: '5', tag: '#RecruiterLife', postsCount: '2.4K' },
];

const MOCK_RECRUITERS: TopRecruiter[] = [
    { id: '1', name: 'Alex Rivera', hires: 142, company: 'Amazon', avatar: 'https://ui-avatars.com/api/?name=Alex+Rivera&background=0d33f2&color=fff' },
    { id: '2', name: 'Priya Sharma', hires: 128, company: 'Microsoft', avatar: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=00d1ff&color=fff' },
    { id: '3', name: 'Jason Smith', hires: 115, company: 'Tesla', avatar: 'https://ui-avatars.com/api/?name=Jason+Smith&background=f20d85&color=fff' },
];

const Community: React.FC = () => {
    const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);

    const handleLike = (id: string) => {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Main Feed */}
            <div className="lg:col-span-8 space-y-6">
                {/* Create Post */}
                <div className="bg-white border border-blue-50 rounded-[2rem] p-6 shadow-soft">
                    <div className="flex gap-4">
                        <div className="size-11 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border border-slate-200">
                            <img src="https://ui-avatars.com/api/?name=User&background=0d33f2&color=fff" alt="User" />
                        </div>
                        <div className="flex-1">
                            <textarea
                                placeholder="Share an insight or ask the community..."
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm focus:ring-2 focus:ring-primary/10 resize-none min-h-[100px] transition-all"
                            />
                            <div className="flex items-center justify-between mt-4">
                                <div className="flex gap-2">
                                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-text-secondary hover:text-primary transition-all text-xs font-semibold">
                                        <span className="material-symbols-outlined text-lg">image</span>
                                        Media
                                    </button>
                                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-blue-50 text-text-secondary hover:text-primary transition-all text-xs font-semibold">
                                        <span className="material-symbols-outlined text-lg">tag</span>
                                        Tag
                                    </button>
                                </div>
                                <button className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 hover:bg-primary-hover transition-all">
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Posts */}
                {posts.map((post) => (
                    <div key={post.id} className="bg-white border border-blue-50 rounded-[2rem] p-6 shadow-soft hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="size-11 rounded-full overflow-hidden border-2 border-slate-50">
                                    <img src={post.author.avatar} alt={post.author.name} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-text-main text-sm">{post.author.name}</h4>
                                    <p className="text-[11px] text-text-secondary">{post.author.role} • {post.time}</p>
                                </div>
                            </div>
                            <button className="text-text-secondary hover:text-primary p-2">
                                <span className="material-symbols-outlined">more_horiz</span>
                            </button>
                        </div>

                        <p className="text-sm text-text-main leading-relaxed mb-4">
                            {post.content}
                        </p>

                        <div className="flex flex-wrap gap-2 mb-6">
                            {post.tags.map(tag => (
                                <span key={tag} className="text-[10px] font-bold text-primary px-3 py-1 bg-blue-50 rounded-full">#{tag}</span>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-blue-50">
                            <div className="flex gap-6">
                                <button
                                    onClick={() => handleLike(post.id)}
                                    className="flex items-center gap-2 text-text-secondary hover:text-accent-red transition-colors group/like"
                                >
                                    <span className="material-symbols-outlined text-xl group-hover/like:filled active:scale-125 transition-transform">favorite</span>
                                    <span className="text-xs font-semibold">{post.likes}</span>
                                </button>
                                <button className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-xl">chat_bubble</span>
                                    <span className="text-xs font-semibold">{post.comments}</span>
                                </button>
                                <button className="flex items-center gap-2 text-text-secondary hover:text-primary transition-colors">
                                    <span className="material-symbols-outlined text-xl">share</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Sidebar Widgets */}
            <div className="lg:col-span-4 space-y-6">
                {/* Trending Widget */}
                <div className="bg-white border border-blue-50 rounded-[2rem] p-6 shadow-soft">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                            <span className="material-symbols-outlined">trending_up</span>
                        </div>
                        <h3 className="font-bold text-text-main">Global Trends</h3>
                    </div>
                    <div className="space-y-4">
                        {MOCK_TRENDS.map((trend) => (
                            <div key={trend.id} className="flex items-center justify-between group cursor-pointer">
                                <div>
                                    <p className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">{trend.tag}</p>
                                    <p className="text-[11px] text-text-secondary">{trend.postsCount} posts this week</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                            </div>
                        ))}
                    </div>
                    <button className="w-full mt-6 py-3 rounded-xl border border-blue-50 text-xs font-bold text-primary hover:bg-blue-50 transition-all">
                        View All Trends
                    </button>
                </div>

                {/* Leaderboard Widget */}
                <div className="bg-white border border-blue-50 rounded-[2rem] p-6 shadow-soft overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-4">
                        <span className="material-symbols-outlined text-primary/10 text-8xl -rotate-12 select-none pointer-events-none">emoji_events</span>
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="size-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center">
                                <span className="material-symbols-outlined">workspace_premium</span>
                            </div>
                            <h3 className="font-bold text-text-main">Top Recruiters</h3>
                        </div>
                        <div className="space-y-5">
                            {MOCK_RECRUITERS.map((rec, index) => (
                                <div key={rec.id} className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="size-10 rounded-full overflow-hidden border-2 border-white shadow-sm">
                                            <img src={rec.avatar} alt={rec.name} />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 size-5 rounded-full bg-white flex items-center justify-center text-[10px] font-black shadow-sm">
                                            {index + 1}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-text-main truncate">{rec.name}</p>
                                        <p className="text-[10px] text-text-secondary truncate">{rec.company}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-primary">{rec.hires}</p>
                                        <p className="text-[9px] text-text-secondary uppercase">Hires</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Community Guidelines */}
                <div className="p-6 bg-gradient-to-br from-primary to-blue-600 rounded-[2rem] text-white shadow-lg shadow-blue-500/20">
                    <h3 className="font-bold text-lg mb-2">Join the Slack</h3>
                    <p className="text-xs text-white/80 leading-relaxed mb-4">
                        Connect with 5,000+ AI recruiters, share playbooks, and participate in weekly AMAs.
                    </p>
                    <button className="w-full py-3 bg-white text-primary rounded-xl text-xs font-bold hover:bg-blue-50 transition-all shadow-lg">
                        Connect Slack
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Community;
