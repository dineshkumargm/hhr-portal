import React, { useState } from 'react';

interface Plugin {
    id: string;
    name: string;
    description: string;
    category: 'AI Tools' | 'ATS' | 'Communication' | 'Sourcing';
    icon: string;
    status: 'Connected' | 'Inactive' | 'Pending';
    popular?: boolean;
}

const PLUGINS_DATA: Plugin[] = [
    {
        id: 'linkedin',
        name: 'LinkedIn Sourcing',
        description: 'Import candidates directly from LinkedIn profiles and jobs.',
        category: 'Sourcing',
        icon: 'https://cdn-icons-png.flaticon.com/512/174/174857.png',
        status: 'Connected',
        popular: true,
    },
    {
        id: 'slack',
        name: 'Slack Notifications',
        description: 'Get real-time alerts for new applicants and interview updates.',
        category: 'Communication',
        icon: 'https://cdn-icons-png.flaticon.com/512/3800/3800024.png',
        status: 'Connected',
    },
    {
        id: 'gmail',
        name: 'Gmail Integration',
        description: 'Sync conversations and schedule interviews directly via email.',
        category: 'Communication',
        icon: 'https://cdn-icons-png.flaticon.com/512/732/732200.png',
        status: 'Inactive',
        popular: true,
    },
    {
        id: 'greenhouse',
        name: 'Greenhouse ATS',
        description: 'Synchronize job posts and candidate stages with Greenhouse.',
        category: 'ATS',
        icon: 'https://www.greenhouse.io/assets/favicon.ico',
        status: 'Inactive',
    },
    {
        id: 'lever',
        name: 'Lever Sync',
        description: 'Two-way integration for candidates and job requisitions.',
        category: 'ATS',
        icon: 'https://www.lever.co/wp-content/themes/lever-v2/assets/img/lever-favicon.png',
        status: 'Inactive',
    },
    {
        id: 'gemini-pro',
        name: 'Gemini Pro AI',
        description: 'Advanced resume analysis and interview question generation.',
        category: 'AI Tools',
        icon: 'https://www.gstatic.com/lamda/images/favicon_v2_192x192.png',
        status: 'Connected',
        popular: true,
    },
    {
        id: 'zoom',
        name: 'Zoom Meetings',
        description: 'Automatically generate meeting links for your interviews.',
        category: 'Communication',
        icon: 'https://st1.zoom.us/zoom.ico',
        status: 'Inactive',
    },
    {
        id: 'calendly',
        name: 'Calendly Sync',
        description: 'Let candidates pick their own interview slots easily.',
        category: 'Communication',
        icon: 'https://assets.calendly.com/assets/frontend/media/favicon-32x32-72352277d3f8.png',
        status: 'Inactive',
    }
];

const Plugins: React.FC = () => {
    const [plugins, setPlugins] = useState<Plugin[]>(PLUGINS_DATA);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('All');

    const categories = ['All', 'AI Tools', 'ATS', 'Communication', 'Sourcing'];

    const filteredPlugins = plugins.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = activeCategory === 'All' || p.category === activeCategory;
        return matchesSearch && matchesCategory;
    });

    const toggleStatus = (id: string) => {
        setPlugins(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, status: p.status === 'Connected' ? 'Inactive' : 'Connected' };
            }
            return p;
        }));
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Search & Filter Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex-1 max-w-xl">
                    <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary group-focus-within:text-primary transition-colors">
                            search
                        </span>
                        <input
                            type="text"
                            placeholder="Search plugins and integrations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-white border border-blue-50 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft"
                        />
                    </div>
                </div>

                <div className="flex gap-2 p-1.5 bg-white border border-blue-50 rounded-2xl shadow-soft overflow-x-auto no-scrollbar">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${activeCategory === cat
                                    ? 'bg-primary text-white shadow-lg shadow-blue-500/30'
                                    : 'text-text-secondary hover:text-primary hover:bg-blue-50'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPlugins.map((plugin) => (
                    <div
                        key={plugin.id}
                        className="group bg-white border border-blue-50 rounded-[2rem] p-6 shadow-soft hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
                    >
                        {plugin.popular && (
                            <div className="absolute top-4 right-4 bg-orange-50 text-orange-600 text-[10px] font-bold px-2 py-1 rounded-full border border-orange-100 uppercase tracking-wider">
                                Popular
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="size-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 p-2 group-hover:scale-110 transition-transform duration-500">
                                    <img src={plugin.icon} alt={plugin.name} className="w-full h-full object-contain" />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                    <h3 className="font-bold text-text-main truncate text-lg">{plugin.name}</h3>
                                    <span className="text-[11px] font-semibold text-primary uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">
                                        {plugin.category}
                                    </span>
                                </div>
                            </div>

                            <p className="text-sm text-text-secondary leading-relaxed min-h-[4.5rem]">
                                {plugin.description}
                            </p>

                            <div className="flex items-center justify-between pt-2 border-t border-blue-50">
                                <div className="flex items-center gap-2">
                                    <div className={`size-2 rounded-full ${plugin.status === 'Connected' ? 'bg-accent-green animate-pulse' : 'bg-slate-300'
                                        }`} />
                                    <span className="text-[13px] font-medium text-text-secondary">
                                        {plugin.status}
                                    </span>
                                </div>

                                <button
                                    onClick={() => toggleStatus(plugin.id)}
                                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${plugin.status === 'Connected'
                                            ? 'bg-red-50 text-accent-red hover:bg-red-100'
                                            : 'bg-primary text-white hover:bg-primary-hover shadow-lg shadow-blue-500/20'
                                        }`}
                                >
                                    {plugin.status === 'Connected' ? 'Disconnect' : 'Connect'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Request New Plugin Card */}
                <div className="border-2 border-dashed border-blue-100 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center space-y-4 hover:border-primary hover:bg-blue-50/30 transition-all cursor-pointer group">
                    <div className="size-12 rounded-full bg-blue-50 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                        <span className="material-symbols-outlined text-[28px]">add</span>
                    </div>
                    <div>
                        <h3 className="font-bold text-text-main">Request Plugin</h3>
                        <p className="text-xs text-text-secondary mt-1 px-4">
                            Can't find what you need? Suggest a new integration to our team.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Plugins;
