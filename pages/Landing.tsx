import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface LandingProps {
    onRegisterClick?: () => void;
    onLoginClick?: () => void;
}

const Landing: React.FC<LandingProps> = () => {
    return (
        <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark text-text-main dark:text-white transition-colors duration-200">
            {/* Navbar */}
            <header className="sticky top-0 z-50 w-full glass-panel border-b border-[#e7e9f4] dark:border-gray-800 transition-all duration-200">
                <div className="px-4 md:px-10 lg:px-40 py-3 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3 text-text-main dark:text-white cursor-pointer group">
                        <div className="size-10 rounded-xl bg-gradient-to-br from-[#0d33f2] to-[#1e40af] flex items-center justify-center text-white transition-all group-hover:scale-110 shadow-lg shadow-blue-500/20">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L4 7V17L12 22L20 17V7L12 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="12" cy="12" r="3" fill="white" />
                            </svg>
                        </div>
                        <h2 className="text-xl tracking-tight">
                            <span className="text-primary font-black">Agent</span> <span className="font-bold">KAI</span>
                        </h2>
                    </Link>
                    <div className="hidden md:flex flex-1 justify-end gap-8 items-center">
                        <div className="flex items-center gap-6">
                            <a className="text-sm font-medium hover:text-[#0d33f2] transition-colors dark:text-gray-300 dark:hover:text-white" href="#features">Features</a>
                            <a className="text-sm font-medium hover:text-[#0d33f2] transition-colors dark:text-gray-300 dark:hover:text-white" href="#pricing">Pricing</a>
                        </div>
                        <div className="flex items-center gap-3">
                            <Link
                                to="/login"
                                className="text-sm font-bold h-10 px-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all dark:text-white inline-flex items-center"
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/register"
                                className="bg-[#0d33f2] hover:bg-[#0b2bd1] text-white text-sm font-bold h-10 px-6 rounded-lg transition-all shadow-lg hover:shadow-[#0d33f2]/30 active:scale-95 inline-flex items-center"
                            >
                                Get Started
                            </Link>
                        </div>
                    </div>
                    {/* Mobile Menu Icon */}
                    <button className="md:hidden p-2 text-text-main dark:text-white">
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-grow flex flex-col items-center w-full">
                {/* Hero Section */}
                <section className="relative w-full px-4 md:px-10 lg:px-40 py-16 md:py-24 overflow-hidden">
                    {/* Background Decoration */}
                    <div className="absolute inset-0 hero-pattern pointer-events-none"></div>
                    <div className="relative max-w-[1280px] mx-auto flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                        {/* Text Content */}
                        <div className="flex flex-col gap-6 lg:w-1/2 text-left z-10">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0d33f2]/10 border border-[#0d33f2]/20 w-fit">
                                <span className="material-symbols-outlined text-[#0d33f2] text-sm">auto_awesome</span>
                                <span className="text-[#0d33f2] text-xs font-bold uppercase tracking-wide">New AI Engine v2.0</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-[-0.033em] text-text-main dark:text-white">
                                Shortlist Top Talent in <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0d33f2] to-purple-600">Seconds</span>, Not Hours.
                            </h1>
                            <h2 className="text-base md:text-lg text-text-sub dark:text-gray-400 font-normal leading-relaxed max-w-xl">
                                The AI Recruiter that never sleeps. Automate your screening process with unbiased, skill-based matching that integrates seamlessly with your ATS.
                            </h2>
                            <div className="flex flex-wrap gap-4 mt-2">
                                <Link
                                    to="/register"
                                    className="bg-[#0d33f2] hover:bg-[#0b2bd1] text-white h-12 px-6 rounded-lg font-bold text-base transition-all shadow-lg shadow-[#0d33f2]/25 hover:shadow-[#0d33f2]/40 active:scale-95 flex items-center gap-2"
                                >
                                    <span>Get Started for Free</span>
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </Link>
                                <button className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-text-main dark:text-white h-12 px-6 rounded-lg font-bold text-base hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[#0d33f2]">play_circle</span>
                                    <span>Watch how it works</span>
                                </button>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-text-sub dark:text-gray-500 mt-4">
                                <div className="flex -space-x-2">
                                    <div className="size-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-200 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/seed/user1/32/32')" }}></div>
                                    <div className="size-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-300 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/seed/user2/32/32')" }}></div>
                                    <div className="size-8 rounded-full border-2 border-white dark:border-gray-900 bg-gray-400 bg-cover bg-center" style={{ backgroundImage: "url('https://picsum.photos/seed/user3/32/32')" }}></div>
                                </div>
                                <p>Trusted by 2,000+ HR Teams</p>
                            </div>
                        </div>
                        {/* Visual Mockup */}
                        <div className="lg:w-1/2 w-full relative z-10 perspective-1000">
                            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden transform lg:rotate-y-[-5deg] lg:rotate-x-[5deg] transition-transform duration-500 hover:rotate-0">
                                {/* Abstract UI Header */}
                                <div className="flex items-center gap-2 p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                    <div className="ml-4 h-2 w-32 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                                </div>
                                {/* Mockup Image Content */}
                                <div className="relative w-full aspect-[4/3] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://picsum.photos/seed/dashboard/800/600')" }}>
                                    {/* Floating Element Overlay */}
                                    <div className="absolute bottom-8 right-8 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 max-w-[200px] animate-bounce" style={{ animationDuration: '3s' }}>
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                                                <span className="material-symbols-outlined text-xl">check_circle</span>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Match Found</p>
                                                <p className="text-sm font-bold text-gray-900 dark:text-white">98% Fit Score</p>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-[98%]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* Decorative background glow */}
                            <div className="absolute -inset-4 bg-[#0d33f2]/20 blur-3xl -z-10 rounded-full opacity-50"></div>
                        </div>
                    </div>
                </section>

                {/* Social Proof */}
                <section className="w-full border-y border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 py-10 text-center">
                    <div className="max-w-[1280px] mx-auto px-4 md:px-10 flex flex-col items-center gap-6">
                        <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest">Powering hiring for industry leaders</p>
                        <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                            <div className="flex items-center gap-2 text-xl font-bold text-gray-600 dark:text-gray-400"><span className="material-symbols-outlined">diamond</span> Acme Corp</div>
                            <div className="flex items-center gap-2 text-xl font-bold text-gray-600 dark:text-gray-400"><span className="material-symbols-outlined">rocket_launch</span> Stratos</div>
                            <div className="flex items-center gap-2 text-xl font-bold text-gray-600 dark:text-gray-400"><span className="material-symbols-outlined">globe</span> GlobalBank</div>
                            <div className="flex items-center gap-2 text-xl font-bold text-gray-600 dark:text-gray-400"><span className="material-symbols-outlined">stadia_controller</span> NexusTech</div>
                            <div className="flex items-center gap-2 text-xl font-bold text-gray-600 dark:text-gray-400"><span className="material-symbols-outlined">forest</span> GreenLeaf</div>
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section id="features" className="w-full py-20 px-4 md:px-10 lg:px-40 bg-background-light dark:bg-background-dark">
                    <div className="max-w-[960px] mx-auto flex flex-col gap-12">
                        <div className="flex flex-col gap-4 text-center items-center">
                            <span className="text-[#0d33f2] font-semibold tracking-wider uppercase text-sm">Key Benefits</span>
                            <h2 className="text-3xl md:text-4xl font-bold text-text-main dark:text-white max-w-2xl"> Why Choose Our AI Dashboard? </h2>
                            <p className="text-text-sub dark:text-gray-400 text-lg max-w-2xl"> Experience the future of hiring with features designed for speed, accuracy, and fairness. </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Card 1 */}
                            <div className="group p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:bg-[#0d33f2] group-hover:text-white transition-colors text-[#0d33f2]">
                                    <span className="material-symbols-outlined text-2xl">shield</span>
                                </div>
                                <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">Unbiased Screening</h3>
                                <p className="text-text-sub dark:text-gray-400 leading-relaxed"> Eliminate unconscious bias with purely skill-based matching algorithms that focus on potential, not demographics. </p>
                            </div>
                            {/* Card 2 */}
                            <div className="group p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-4 group-hover:bg-amber-500 group-hover:text-white transition-colors text-amber-500">
                                    <span className="material-symbols-outlined text-2xl">bolt</span>
                                </div>
                                <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">Instant Ranking</h3>
                                <p className="text-text-sub dark:text-gray-400 leading-relaxed"> Upload 1,000+ resumes and get the top 10 candidates ranked instantly based on job description relevance. </p>
                            </div>
                            {/* Card 3 */}
                            <div className="group p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-card hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                <div className="w-12 h-12 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-4 group-hover:bg-purple-500 group-hover:text-white transition-colors text-purple-500">
                                    <span className="material-symbols-outlined text-2xl">extension</span>
                                </div>
                                <h3 className="text-xl font-bold text-text-main dark:text-white mb-2">Smart Integration</h3>
                                <p className="text-text-sub dark:text-gray-400 leading-relaxed"> Syncs perfectly with your existing ATS workflow (Greenhouse, Lever, Workday) without disruption. </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="w-full py-24 px-4 bg-background-light dark:bg-background-dark relative overflow-hidden">
                    <div className="absolute inset-0 bg-[#0d33f2]/5 dark:bg-[#0d33f2]/10 skew-y-3 origin-bottom-left transform scale-110"></div>
                    <div className="relative max-w-4xl mx-auto text-center flex flex-col items-center gap-8">
                        <h2 className="text-4xl md:text-5xl font-black text-text-main dark:text-white tracking-tight"> Ready to streamline your hiring? </h2>
                        <p className="text-lg md:text-xl text-text-sub dark:text-gray-400 max-w-2xl"> Join thousands of HR professionals saving 20+ hours every week. Start your 14-day free trial today. </p>
                        <div className="flex flex-col sm:flex-row w-full justify-center gap-4 mt-4">
                            <Link
                                to="/register"
                                className="bg-[#0d33f2] hover:bg-[#0b2bd1] text-white h-14 px-8 rounded-xl font-bold text-lg transition-all shadow-xl hover:shadow-[#0d33f2]/50 hover:-translate-y-1 inline-flex items-center justify-center"
                            >
                                Get Started Now
                            </Link>
                            <button className="bg-white dark:bg-transparent border border-gray-300 dark:border-gray-600 text-text-main dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 h-14 px-8 rounded-xl font-bold text-lg transition-all">
                                Talk to Sales
                            </button>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-4"> No credit card required · Cancel anytime · GDPR Compliant </p>
                    </div>
                </section>
            </main>

            {/* Footer */}
            <footer className="w-full bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pt-16 pb-8 px-4 md:px-10 lg:px-40">
                <div className="max-w-[1280px] mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-12">
                    <div className="col-span-2 lg:col-span-2 flex flex-col gap-4 pr-8">
                        <div className="flex items-center gap-2 text-text-main dark:text-white">
                            <div className="size-6 rounded bg-[#0d33f2] flex items-center justify-center text-white">
                                <span className="material-symbols-outlined text-sm">analytics</span>
                            </div>
                            <span className="text-lg tracking-tight"><span className="text-primary font-black">Agent</span> <span className="font-bold">KAI</span></span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs"> The next generation AI-powered recruitment platform helping companies build better teams, faster. </p>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h4 className="font-bold text-text-main dark:text-white">Product</h4>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">Features</a>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">Integrations</a>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">Pricing</a>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">Changelog</a>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h4 className="font-bold text-text-main dark:text-white">Company</h4>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">About</a>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">Careers</a>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">Blog</a>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">Contact</a>
                    </div>
                    <div className="flex flex-col gap-4">
                        <h4 className="font-bold text-text-main dark:text-white">Legal</h4>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">Privacy</a>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">Terms</a>
                        <a className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#0d33f2] transition-colors" href="#">Security</a>
                    </div>
                </div>
                <div className="max-w-[1280px] mx-auto border-t border-gray-100 dark:border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-sm text-gray-400">© 2026 Agent KAI. All rights reserved.</p>
                    <div className="flex gap-4">
                        <a className="text-gray-400 hover:text-[#0d33f2]" href="#"><span className="material-symbols-outlined text-lg">mail</span></a>
                        <a className="text-gray-400 hover:text-[#0d33f2]" href="#"><span className="material-symbols-outlined text-lg">public</span></a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
