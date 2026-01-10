import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { db } from '../services/db';
import { Job, Candidate } from '../types';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

type ContextType = 'job' | 'resume' | 'candidate' | null;

interface ChatContext {
    type: ContextType;
    jobId?: string;
    candidateId?: string;
    data?: Job | Candidate;
}

const Chat: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [context, setContext] = useState<ChatContext>({ type: null });
    const [jobs, setJobs] = useState<Job[]>([]);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [showStartScreen, setShowStartScreen] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const savedHistory = localStorage.getItem('chat_history');
        if (savedHistory) {
            try {
                const parsed = JSON.parse(savedHistory);
                // Convert string dates back to Date objects
                const hydrated = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
                if (hydrated.length > 1) { // More than just the initial greeting
                    setShowStartScreen(true);
                    return;
                }
            } catch (e) {
                console.error("Failed to parse chat history", e);
            }
        }
        // If no valid history, start fresh immediately
        startNewChat();
    }, []);

    useEffect(() => {
        if (messages.length > 0) {
            localStorage.setItem('chat_history', JSON.stringify(messages));
        }
    }, [messages]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [jobsData, candidatesData] = await Promise.all([
                    db.jobs.find(),
                    db.candidates.find()
                ]);
                setJobs(jobsData);
                setCandidates(candidatesData);
            } catch (err) {
                console.error("Failed to load data:", err);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, showStartScreen]); // Add showStartScreen dependency

    const startNewChat = () => {
        const initialMsg: Message = {
            id: '1',
            role: 'assistant',
            content: "Hello! I'm **KAI Agent**. I can help you analyze candidates, discuss job descriptions, review resumes, or answer questions about your recruitment pipeline.\n\nSelect a **Job**, **Resume**, or **Candidate** to get started, or just ask me anything!",
            timestamp: new Date()
        };
        setMessages([initialMsg]);
        setContext({ type: null });
        localStorage.removeItem('chat_history');
        setShowStartScreen(false);
    };

    const continueChat = () => {
        const savedHistory = localStorage.getItem('chat_history');
        if (savedHistory) {
            const parsed = JSON.parse(savedHistory);
            const hydrated = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
            setMessages(hydrated);
            setShowStartScreen(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (showContextMenu && !target.closest('.context-menu-container')) {
                setShowContextMenu(false);
            }
        };

        if (showContextMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showContextMenu]);

    const loadContextData = async (type: ContextType, id: string) => {
        try {
            if (type === 'job') {
                const job = jobs.find(j => j.id === id) || await db.jobs.findOne({ id });
                if (job) {
                    setContext({ type: 'job', jobId: id, data: job });
                    addSystemMessage(`Now discussing Job: **${job.title}** (${job.department})`);
                }
            } else if (type === 'candidate' || type === 'resume') {
                // Always fetch fresh to get resumeBase64 which is excluded in list view
                const candidate = await db.candidates.findOne({ id });
                if (candidate) {
                    setContext({
                        type: type,
                        candidateId: id,
                        data: candidate
                    });
                    const msg = type === 'resume'
                        ? `Now reviewing Resume: **${candidate.name}**`
                        : `Now discussing Candidate: **${candidate.name}** (${candidate.role})`;
                    addSystemMessage(msg);
                }
            }
        } catch (err) {
            console.error("Failed to load context:", err);
            addSystemMessage("Failed to load the selected context. Please try again.");
        }
    };

    const addSystemMessage = (content: string) => {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content,
            timestamp: new Date()
        }]);
    };

    const buildContextPrompt = async (): Promise<string> => {
        let contextPrompt = "You are KAI Agent, an advanced AI recruitment assistant designed to be helpful, professional, and data-driven. Use markdown formatting (bolding, lists, tables) to make your responses easy to read. ";

        if (context.type === 'job' && context.data) {
            const job = context.data as Job;
            contextPrompt += `\n\nCURRENT CONTEXT - JOB DESCRIPTION:\n`;
            contextPrompt += `Job ID: ${job.id}\n`;
            contextPrompt += `Title: ${job.title}\n`;
            contextPrompt += `Department: ${job.department}\n`;
            contextPrompt += `Location: ${job.location}\n`;
            contextPrompt += `Type: ${job.type}\n`;
            contextPrompt += `Status: ${job.status}\n`;
            contextPrompt += `Required Skills: ${job.skills?.join(', ') || 'Not specified'}\n`;
            contextPrompt += `Applicants Count: ${job.applicantsCount || 0}\n`;
            contextPrompt += `High Matches Count: ${job.matchesCount || 0}\n`;
            if (job.description) {
                contextPrompt += `Full Description: ${job.description}\n`;
            }

            // Include candidates for this job
            const jobCandidates = candidates.filter(c => c.associatedJdId === job.id);
            if (jobCandidates.length > 0) {
                contextPrompt += `\nCandidates for this job (${jobCandidates.length}):\n`;
                jobCandidates.forEach((c, idx) => {
                    contextPrompt += `${idx + 1}. ${c.name} - ${c.role} (${c.matchScore}% match, Status: ${c.status})\n`;
                });
            }

            contextPrompt += `\nThe user is asking about this job. Answer with structured insights.`;
        } else if (context.type === 'candidate' && context.data) {
            const candidate = context.data as Candidate;
            contextPrompt += `\n\nCURRENT CONTEXT - CANDIDATE PROFILE:\n`;
            contextPrompt += `Name: ${candidate.name}\n`;
            contextPrompt += `Role: ${candidate.role}\n`;
            contextPrompt += `Company: ${candidate.company}\n`;
            contextPrompt += `Location: ${candidate.location}\n`;
            contextPrompt += `Status: ${candidate.status}\n`;
            contextPrompt += `Match Score: ${candidate.matchScore}%\n`;
            contextPrompt += `Applied Date: ${candidate.appliedDate}\n`;

            if (candidate.analysis) {
                contextPrompt += `\nAI Analysis:\n${candidate.analysis}\n`;
            }

            contextPrompt += `\nThe user is asking about this candidate. Use the data above to provide detailed, reasoned answers.`;
        } else if (context.type === 'resume' && context.data) {
            const candidate = context.data as Candidate;
            contextPrompt += `\n\nCURRENT CONTEXT - RESUME REVIEW:\n`;
            contextPrompt += `Candidate: ${candidate.name}\n`;
            contextPrompt += `Role: ${candidate.role}\n`;
            contextPrompt += `Match Score: ${candidate.matchScore}%\n`;

            if (candidate.analysis) {
                contextPrompt += `\nResume Analysis:\n${candidate.analysis}\n`;
            }

            contextPrompt += `\nThe user is reviewing this resume. Provide critical feedback, strengths, and weaknesses based on the analysis.`;
        } else {
            contextPrompt += `\n\nGENERAL CONTEXT:\n`;
            contextPrompt += `Total Jobs: ${jobs.length}\n`;
            contextPrompt += `Total Candidates: ${candidates.length}\n`;

            if (candidates.length > 0) {
                contextPrompt += `\nCandidate Summary (Top 20):\n`;
                candidates.slice(0, 20).forEach((c, idx) => {
                    contextPrompt += `- ${c.name} (${c.role}): ${c.matchScore}% match\n`;
                });
            }

            if (jobs.length > 0) {
                contextPrompt += `\nActive Jobs:\n`;
                jobs.forEach((j, idx) => {
                    contextPrompt += `- ${j.title} (${j.department}): ${j.applicantsCount} applicants\n`;
                });
            }

            contextPrompt += `\nProvide general recruitment insights or guide the user to select a specific context.`;
        }

        return contextPrompt;
    };

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        // Cancel any previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        abortControllerRef.current = new AbortController();

        try {
            const API_KEY = (() => {
                // @ts-ignore
                if (import.meta.env?.VITE_GEMINI_API_KEY) return import.meta.env.VITE_GEMINI_API_KEY;
                // @ts-ignore
                if (import.meta.env?.GEMINI_API_KEY) return import.meta.env.GEMINI_API_KEY;
                return undefined;
            })();

            if (!API_KEY) {
                throw new Error("API Key not found");
            }

            const genAIInstance = new GoogleGenerativeAI(API_KEY);
            const model = genAIInstance.getGenerativeModel({
                model: 'gemini-1.5-flash'
            });

            const contextPrompt = await buildContextPrompt();

            const previousMessages = messages.slice(1);
            const conversationHistory: Array<{ role: 'user' | 'model', parts: Array<{ text?: string, inlineData?: { mimeType: string, data: string } }> }> = [];

            // Inject Resume PDF if available in context
            if ((context.type === 'resume' || context.type === 'candidate') && context.data && (context.data as any).resumeBase64) {
                const b64 = (context.data as any).resumeBase64;
                conversationHistory.push({
                    role: 'user',
                    parts: [
                        { text: "Here is the candidate's resume document for reference." },
                        {
                            inlineData: {
                                mimeType: 'application/pdf',
                                data: b64
                            }
                        }
                    ]
                });
                conversationHistory.push({
                    role: 'model',
                    parts: [{ text: "I have received the resume document. I will use it to answer your questions accurately." }]
                });
            }

            for (let i = 0; i < previousMessages.length; i++) {
                const msg = previousMessages[i];
                const role = msg.role === 'user' ? 'user' : 'model';
                // Avoid duplicating if we just added history
                const lastAdded = conversationHistory[conversationHistory.length - 1];
                if (!lastAdded || lastAdded.role !== role) {
                    conversationHistory.push({
                        role: role,
                        parts: [{ text: msg.content }]
                    });
                }
            }

            // Adjust history if it doesn't start with user (Gemini requirement)
            if (conversationHistory.length > 0 && conversationHistory[0].role !== 'user') {
                // If the first message is model, we prepend a dummy user message or just remove it if it's not critical. 
                // But since we might have injected the PDF as user, this is likely fine.
                // If PDF injection didn't happen and first msg is model (e.g. greeting), remove it.
                if (!((context.type === 'resume' || context.type === 'candidate') && (context.data as any).resumeBase64)) {
                    conversationHistory.shift();
                }
            }

            let chat;
            chat = model.startChat({
                history: conversationHistory as any,
                generationConfig: {
                    temperature: 0.7,
                }
            });

            const messageWithContext = `${contextPrompt}\n\nUser Question: ${currentInput}`;

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '',
                timestamp: new Date()
            };

            setMessages(prev => [...prev, assistantMsg]);

            const result = await chat.sendMessageStream(messageWithContext);
            let fullResponse = '';

            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullResponse += chunkText;

                setMessages(prev => prev.map(msg =>
                    msg.id === assistantMsg.id
                        ? { ...msg, content: fullResponse }
                        : msg
                ));
            }

        } catch (error: any) {
            console.error("Chat Error:", error);
            if (error.name === 'AbortError') return;

            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                const errorText = "I encountered an issue connecting to the AI service. Please check your connection or API key.";

                if (lastMsg.role === 'assistant' && !lastMsg.content) {
                    return prev.slice(0, -1).concat([{ ...lastMsg, content: errorText }]);
                }
                return prev.concat([{
                    id: Date.now().toString(),
                    role: 'assistant',
                    content: errorText,
                    timestamp: new Date()
                }]);
            });
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const clearContext = () => {
        setContext({ type: null });
        addSystemMessage("Context cleared. Ready for new questions.");
    };

    return (
        <div className="flex flex-col h-full max-w-6xl mx-auto py-6 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="size-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <span className="material-symbols-outlined text-[24px]">smart_toy</span>
                        </div>
                        <div className="absolute -bottom-1 -right-1 size-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                            KAI Agent
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">Beta</span>
                        </h2>
                        <p className="text-sm text-gray-500 font-medium">Your Intelligent Hiring Copilot</p>
                    </div>
                </div>

                <div className="relative context-menu-container">
                    <button
                        onClick={() => setShowContextMenu(!showContextMenu)}
                        className={`h-11 px-5 rounded-xl text-sm font-bold transition-all flex items-center gap-2.5 shadow-sm active:scale-95 ${context.type
                            ? 'bg-gray-900 text-white hover:bg-gray-800'
                            : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">
                            {context.type === 'job' ? 'business_center' :
                                context.type === 'candidate' ? 'person' :
                                    context.type === 'resume' ? 'description' : 'layers'}
                        </span>
                        {context.type
                            ? `${context.type === 'job' ? 'Job' : context.type === 'candidate' ? 'Candidate' : 'Resume'} Active`
                            : 'Set Context'}
                        <span className="material-symbols-outlined text-[18px] opacity-70">expand_more</span>
                    </button>

                    {showContextMenu && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Context</span>
                                {context.type && (
                                    <button onClick={clearContext} className="text-xs font-bold text-red-500 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors">
                                        Clear Active
                                    </button>
                                )}
                            </div>
                            <div className="max-h-[400px] overflow-y-auto p-2 space-y-1">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Jobs</div>
                                {jobs.map(job => (
                                    <button
                                        key={job.id}
                                        onClick={() => { loadContextData('job', job.id); setShowContextMenu(false); }}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 group ${context.jobId === job.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-600'
                                            }`}
                                    >
                                        <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${context.jobId === job.id ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-400 text-[18px] group-hover:bg-blue-100 group-hover:text-blue-600'
                                            }`}>
                                            <span className="material-symbols-outlined text-[18px]">business_center</span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm truncate">{job.title}</div>
                                            <div className="text-xs opacity-70 truncate">{job.department}</div>
                                        </div>
                                    </button>
                                ))}

                                <div className="my-2 border-t border-gray-100"></div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-3 py-2">Candidates</div>
                                {candidates.map(candidate => (
                                    <div key={candidate.id} className="group relative">
                                        <button
                                            onClick={() => { loadContextData('candidate', candidate.id); setShowContextMenu(false); }}
                                            className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center gap-3 ${context.candidateId === candidate.id ? 'bg-green-50 text-green-700' : 'hover:bg-gray-50 text-gray-600'
                                                }`}
                                        >
                                            <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${context.candidateId === candidate.id ? 'bg-green-200 text-green-700' : 'bg-gray-100 text-gray-400 group-hover:bg-green-100 group-hover:text-green-600'
                                                }`}>
                                                <span className="material-symbols-outlined text-[18px]">person</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-bold text-sm truncate">{candidate.name}</div>
                                                <div className="text-xs opacity-70 truncate">{candidate.matchScore}% Match</div>
                                            </div>
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); loadContextData('resume', candidate.id); setShowContextMenu(false); }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                                            title="Analyze Resume"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">description</span>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Context Banner */}
            {context.type && context.data && (
                <div className="mb-4">
                    <div className={`relative overflow-hidden p-4 rounded-2xl border ${context.type === 'job' ? 'bg-blue-50/50 border-blue-100' :
                        context.type === 'candidate' ? 'bg-green-50/50 border-green-100' :
                            'bg-purple-50/50 border-purple-100'
                        }`}>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className={`size-10 rounded-xl flex items-center justify-center shadow-sm ${context.type === 'job' ? 'bg-blue-500 text-white' :
                                context.type === 'candidate' ? 'bg-green-500 text-white' :
                                    'bg-purple-500 text-white'
                                }`}>
                                <span className="material-symbols-outlined text-[20px]">
                                    {context.type === 'job' ? 'business_center' :
                                        context.type === 'candidate' ? 'person' : 'description'}
                                </span>
                            </div>
                            <div>
                                <div className="text-xs font-bold uppercase tracking-wider opacity-60 mb-0.5">
                                    Active {context.type} Context
                                </div>
                                <div className="font-bold text-gray-900">
                                    {context.type === 'job' ? (context.data as Job).title : (context.data as Candidate).name}
                                </div>
                            </div>
                            <button onClick={clearContext} className="ml-auto p-2 rounded-full hover:bg-black/5 transition-colors">
                                <span className="material-symbols-outlined text-[20px] text-gray-500">close</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Area */}
            <div className="flex-1 bg-white rounded-[32px] border border-gray-200 shadow-sm overflow-hidden flex flex-col relative transition-all">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

                {showStartScreen ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-8 z-20 bg-white/50 backdrop-blur-sm animate-in fade-in duration-500">
                        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center transform transition-all hover:scale-[1.01] duration-300">
                            <div className="size-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 mx-auto mb-6">
                                <span className="material-symbols-outlined text-[40px]">smart_toy</span>
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h2>
                            <p className="text-gray-500 mb-8">You have an active session from before. Would you like to continue where you left off?</p>

                            <div className="space-y-3">
                                <button
                                    onClick={continueChat}
                                    className="w-full py-4 px-6 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-black transition-all flex items-center justify-center gap-3 shadow-lg shadow-gray-200 hover:shadow-xl active:scale-95"
                                >
                                    <span className="material-symbols-outlined">history</span>
                                    Continue Discussion
                                </button>
                                <button
                                    onClick={startNewChat}
                                    className="w-full py-4 px-6 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl font-bold text-sm hover:border-blue-100 hover:bg-blue-50 hover:text-blue-600 transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    <span className="material-symbols-outlined">add_comment</span>
                                    Start New Chat
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar relative z-10 scroll-smooth">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`max-w-[90%] lg:max-w-[85%] flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    {/* Avatar */}
                                    <div className={`size-10 rounded-2xl shrink-0 flex items-center justify-center shadow-sm ${msg.role === 'user'
                                        ? 'bg-gray-900 text-white'
                                        : 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                                        }`}>
                                        {msg.role === 'user' ? (
                                            <span className="material-symbols-outlined text-[20px]">person</span>
                                        ) : (
                                            <span className="material-symbols-outlined text-[20px]">smart_toy</span>
                                        )}
                                    </div>

                                    {/* Message Bubble */}
                                    <div className={`group relative p-6 rounded-3xl text-[15px] leading-relaxed shadow-sm ${msg.role === 'user'
                                        ? 'bg-gray-900 text-gray-50 rounded-tr-none'
                                        : 'bg-white border border-gray-100 rounded-tl-none hover:shadow-md transition-shadow'
                                        }`}>
                                        {msg.role === 'assistant' ? (
                                            <div className="markdown-content prose prose-slate max-w-none 
                                            prose-p:leading-loose 
                                            prose-headings:text-gray-800 prose-headings:font-bold prose-headings:mb-4
                                            prose-strong:font-bold prose-strong:text-gray-900
                                            prose-ul:my-4 prose-li:my-1
                                            prose-table:w-full prose-table:border-collapse prose-table:my-6 prose-table:rounded-xl prose-table:overflow-hidden prose-table:shadow-sm
                                            prose-thead:bg-gray-50 prose-th:p-4 prose-th:text-left prose-th:text-xs prose-th:uppercase prose-th:tracking-wider prose-th:text-gray-500 prose-th:font-bold prose-th:border-b prose-th:border-gray-100
                                            prose-td:p-4 prose-td:text-gray-700 prose-td:border-b prose-td:border-gray-50 last:prose-td:border-0
                                            prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
                                        ">
                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <div className="whitespace-pre-wrap">{msg.content}</div>
                                        )}
                                        <div className={`text-[10px] mt-3 font-medium opacity-40 ${msg.role === 'user' ? 'text-right text-white' : 'text-gray-400'}`}>
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start animate-in fade-in duration-300">
                                <div className="max-w-[80%] flex gap-4">
                                    <div className="size-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                                        <span className="material-symbols-outlined text-[20px] animate-spin-slow">smart_toy</span>
                                    </div>
                                    <div className="p-6 bg-white rounded-3xl rounded-tl-none border border-gray-100 shadow-sm flex items-center gap-2 h-[72px]">
                                        <div className="size-2.5 bg-blue-500 rounded-full animate-bounce"></div>
                                        <div className="size-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                                        <div className="size-2.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Input Area */}
                <div className="p-4 bg-white/80 backdrop-blur-md border-t border-gray-100">
                    <form onSubmit={handleSend} className="max-w-4xl mx-auto relative group">
                        <div className={`absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-10 group-hover:opacity-20 transition duration-500 blur ${isLoading ? 'opacity-20 animate-pulse' : ''}`}></div>
                        <div className="relative flex items-end gap-2 bg-white rounded-2xl p-2 border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                            <button
                                type="button"
                                onClick={() => setShowContextMenu(!showContextMenu)}
                                className="size-10 flex items-center justify-center rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                                title="Attach Context"
                            >
                                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                            </button>

                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your message..."
                                className="w-full max-h-32 py-3 bg-transparent text-gray-800 placeholder-gray-400 text-sm font-medium resize-none focus:outline-none no-scrollbar"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />

                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="h-10 px-6 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center gap-2 shrink-0 mb-0.5"
                            >
                                Send
                                <span className="material-symbols-outlined text-[16px]">send</span>
                            </button>
                        </div>
                    </form>
                    <div className="text-center mt-2">
                        <p className="text-[10px] text-gray-400 font-medium">
                            AI Output generated by Gemini Flash. Double check for accuracy.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
