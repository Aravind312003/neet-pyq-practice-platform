import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Trophy, BookOpen, Clock, Award, Bookmark, Play, HelpCircle, ChevronRight, CheckCircle2, Search, ArrowRight } from 'lucide-react';
import Toast, { ToastType } from '../components/Toast';
import { Question } from '../types';

const API_BASE = 'https://neet-pyq-practice-platform.onrender.com/api';

const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [bookmarkCount, setBookmarkCount] = useState<number>(0);
  const [pastAttemptsCount, setPastAttemptsCount] = useState<number>(0);
  const [avgScore, setAvgScore] = useState<number>(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  const [subjectsList, setSubjectsList] = useState<string[]>(['Biology', 'Chemistry', 'Physics']);
  const [chaptersList, setChaptersList] = useState<string[]>([]);
  const [yearsList] = useState<number[]>([2025, 2024, 2023, 2022, 2021, 2020]);

  const [interactiveQuestions, setInteractiveQuestions] = useState<Question[]>([]);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);

  const [checkedAnswers, setCheckedAnswers] = useState<{ [key: string]: { selected: string; isCorrect: boolean } }>({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string | number>>(new Set());

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message: string, type: ToastType) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE}/bookmarks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const idsList = data.bookmarks || [];
          setBookmarkCount(idsList.length);
          setBookmarkedIds(new Set(idsList.map((id: any) => id.toString())));
        }
      } catch (err) {
        console.warn('Failed to fetch bookmarks for stats:', err);
      }
    };

    fetchProfileData();

    const savedResult = localStorage.getItem('neet_latest_test_result');
    if (savedResult) {
      try {
        const parsed = JSON.parse(savedResult);
        setPastAttemptsCount(1);
        setAvgScore(parsed.score || 0);
      } catch (err) {
        console.error(err);
      }
    }
  }, [token]);

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const subRes = await fetch(`${API_BASE}/questions/subjects`);
        if (subRes.ok) {
          const subData = await subRes.json();
          if (subData.subjects && subData.subjects.length > 0) {
            setSubjectsList(subData.subjects);
          }
        }
      } catch (err) {
        console.warn('Error fetching subjects:', err);
      }
    };
    fetchDropdowns();
  }, []);

  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const url = selectedSubject ? `${API_BASE}/questions/chapters?subject=${encodeURIComponent(selectedSubject)}` : `${API_BASE}/questions/chapters`;
        const chapRes = await fetch(url);
        if (chapRes.ok) {
          const chapData = await chapRes.json();
          setChaptersList(chapData.chapters || []);
        }
      } catch (err) {
        console.warn('Error fetching chapters:', err);
      }
    };
    setSelectedChapter('');
    fetchChapters();
  }, [selectedSubject]);

  useEffect(() => {
    const fetchBankQuestions = async () => {
      setIsQuestionsLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchTerm) params.append('search', searchTerm);
        if (selectedSubject) params.append('subject', selectedSubject);
        if (selectedChapter) params.append('chapter', selectedChapter);
        if (selectedYear) params.append('year', selectedYear);
        params.append('page', currentPage.toString());
        params.append('pageSize', '5');

        const res = await fetch(`${API_BASE}/questions?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setInteractiveQuestions(data.questions || []);
          setTotalQuestionsCount(data.total || 0);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
      } finally {
        setIsQuestionsLoading(false);
      }
    };
    fetchBankQuestions();
  }, [searchTerm, selectedSubject, selectedChapter, selectedYear, currentPage]);

  const handleStartYearTest = (year: number) => {
    triggerToast(`Initializing NEET ${year} PYQ Practice Paper...`, 'success');
    setTimeout(() => {
      navigate(`/practice/year/${year}`);
    }, 1000);
  };

  const handleStartRandomTest = () => {
    triggerToast('Generating real-time 180-Question NEET Random Mock Paper...', 'success');
    setTimeout(() => {
      navigate('/practice/random/all');
    }, 1000);
  };

  const handleToggleBookmarkInList = async (qId: string | number) => {
    const isCurrentlyBookmarked = bookmarkedIds.has(qId.toString());
    const nextIds = new Set(bookmarkedIds);
    if (isCurrentlyBookmarked) {
      nextIds.delete(qId.toString());
      triggerToast('Removed from saved bookmarks.', 'info');
    } else {
      nextIds.add(qId.toString());
      triggerToast('Added to saved bookmarks archive.', 'success');
    }
    setBookmarkedIds(nextIds);
    setBookmarkCount(nextIds.size);

    if (token) {
      try {
        const url = `${API_BASE}/bookmark/${qId}`;
        await fetch(url, {
          method: isCurrentlyBookmarked ? 'DELETE' : 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Failed to toggle bookmark:', err);
      }
    }
  };

  const handleSelectOptionInList = (question: Question, optionKey: string) => {
    const isCorrect = optionKey.toUpperCase() === question.correct_answer.toUpperCase();
    setCheckedAnswers(prev => ({ ...prev, [question.id.toString()]: { selected: optionKey, isCorrect } }));
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16 pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Welcome Section */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-16 -translate-y-16 w-48 h-48 bg-blue-50 rounded-full opacity-40"></div>
          <div className="space-y-2 relative z-10">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight font-sans">
              Welcome back, {user?.name || 'Future Doctor'}!
            </h1>
            <p className="text-sm text-gray-500 max-w-xl leading-relaxed">
              Accelerate your NEET formulation using verified dynamic previous year question templates, modular assessments, and real-time dashboard profiling analytics.
            </p>
          </div>
          <button
            onClick={handleStartRandomTest}
            className="w-full md:w-auto px-5 py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2.5 text-sm shadow-sm shadow-blue-200 cursor-pointer group shrink-0"
          >
            <Play className="w-4 h-4 fill-white" />
            Launch Full Mock Exam
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Stats Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 font-sans">Target Exam</span>
              <span className="text-lg font-black text-gray-900 block mt-0.5">NEET UG</span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Bookmark className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 font-sans">Saved Marks</span>
              <span className="text-lg font-black text-gray-900 block mt-0.5">{bookmarkCount} Questions</span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 font-sans">Past Attempts</span>
              <span className="text-lg font-black text-gray-900 block mt-0.5">{pastAttemptsCount} Sheets</span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-gray-400 font-sans">Recent High Score</span>
              <span className="text-lg font-black text-gray-900 block mt-0.5">{avgScore} <span className="text-xs font-semibold text-gray-400">/ 720</span></span>
            </div>
          </div>
        </div>

        {/* Core Workspace split layout grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left Column: PYQ Year Paper Cards */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Award className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-sans">NEET Annual PYQ Modules</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3.5">
              {yearsList.map(year => (
                <div key={year} className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex items-center justify-between hover:border-gray-200 transition-all group">
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-gray-900 font-sans block group-hover:text-blue-600 transition-colors">NEET {year} PYQ Paper</span>
                    <span className="text-[11px] text-gray-400 font-medium block">180 Questions • 3 Hours</span>
                  </div>
                  <button
                    onClick={() => handleStartYearTest(year)}
                    className="p-2 bg-gray-50 text-gray-400 hover:bg-blue-600 hover:text-white rounded-lg transition-all group-hover:bg-blue-50 group-hover:text-blue-600"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Searchable Interactive Question Repository Workspace */}
          <div className="lg:col-span-2 space-y-5">
            <div className="flex items-center gap-2 px-1">
              <HelpCircle className="w-4 h-4 text-gray-400" />
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-sans">Sandbox Question Explorer Workspace</h2>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs space-y-4">
              {/* Dynamic Filter Controls Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="col-span-1 sm:col-span-2 lg:col-span-4 relative">
                  <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search queries or specific topics..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-xs font-medium bg-gray-50/50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 placeholder-gray-400 transition-all"
                  />
                </div>

                <select
                  value={selectedSubject}
                  onChange={(e) => { setSelectedSubject(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-600 focus:outline-hidden"
                >
                  <option value="">All Subjects</option>
                  {subjectsList.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <select
                  value={selectedChapter}
                  onChange={(e) => { setSelectedChapter(e.target.value); setCurrentPage(1); }}
                  disabled={!selectedSubject && chaptersList.length === 0}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-600 focus:outline-hidden disabled:bg-gray-50"
                >
                  <option value="">All Chapters</option>
                  {chaptersList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-xs font-semibold bg-white text-gray-600 focus:outline-hidden"
                >
                  <option value="">All Years</option>
                  {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>

              {/* Dynamic Workspace Container */}
              {isQuestionsLoading ? (
                <div className="py-16 text-center">
                  <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="mt-3 text-xs text-gray-400 font-medium">Filtering Item Matrix...</p>
                </div>
              ) : interactiveQuestions.length === 0 ? (
                <div className="py-12 border border-dashed border-gray-200 rounded-xl text-center">
                  <p className="text-xs font-medium text-gray-400">No database documents match specified parameters.</p>
                </div>
              ) : (
                <div className="space-y-5">
                  {interactiveQuestions.map((q) => {
                    const answered = checkedAnswers[q.id.toString()];
                    const isBookmarked = bookmarkedIds.has(q.id.toString());

                    return (
                      <div key={q.id} className="border border-gray-100 rounded-xl p-5 hover:border-gray-200 transition-all space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-2">
                            <span className="px-2 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-600 rounded uppercase">{q.subject}</span>
                            <span className="px-2 py-0.5 text-[9px] font-bold bg-gray-50 text-gray-500 rounded uppercase">{q.chapter}</span>
                            <span className="px-2 py-0.5 text-[9px] font-bold bg-purple-50 text-purple-600 rounded">{q.year} PYQ</span>
                          </div>
                          <button
                            onClick={() => handleToggleBookmarkInList(q.id)}
                            className={`p-1.5 border rounded-lg transition-all ${isBookmarked ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-white text-gray-300 hover:text-gray-400'}`}
                          >
                            <Bookmark className="w-3.5 h-3.5 fill-current" />
                          </button>
                        </div>

                        <p className="text-xs font-bold text-gray-800 leading-relaxed font-sans">{q.question}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {[
                            { key: 'A', text: q.option_a },
                            { key: 'B', text: q.option_b },
                            { key: 'C', text: q.option_c },
                            { key: 'D', text: q.option_d }
                          ].map(opt => {
                            const isSelected = answered?.selected === opt.key;
                            let style = 'border-gray-100 text-gray-600 bg-white hover:bg-gray-50';

                            if (isSelected) {
                              style = answered.isCorrect
                                ? 'bg-emerald-50 border-emerald-400 text-emerald-800 font-semibold'
                                : 'bg-red-50 border-red-400 text-red-800 font-semibold';
                            }

                            return (
                              <button
                                key={opt.key}
                                disabled={!!answered}
                                onClick={() => handleSelectOptionInList(q, opt.key)}
                                className={`text-left px-3 py-2 border rounded-xl text-xs flex items-center gap-2.5 transition-all disabled:opacity-90 ${style}`}
                              >
                                <span className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${isSelected ? (answered.isCorrect ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') : 'bg-gray-100 text-gray-400'}`}>{opt.key}</span>
                                <span>{opt.text}</span>
                              </button>
                            );
                          })}
                        </div>

                        {answered && (
                          <div className={`p-3 rounded-xl flex items-start gap-2.5 ${answered.isCorrect ? 'bg-emerald-50/50 text-emerald-800 border border-emerald-100' : 'bg-red-50/50 text-red-800 border border-red-100'}`}>
                            <CheckCircle2 className={`w-4 h-4 mt-0.5 shrink-0 ${answered.isCorrect ? 'text-emerald-600' : 'text-red-500'}`} />
                            <div className="space-y-1">
                              <p className="text-[11px] font-bold">
                                {answered.isCorrect ? 'Correct submission!' : `Incorrect submission. True option is ${q.correct_answer.toUpperCase()}.`}
                              </p>
                              {q.explanation && (
                                <p className="text-[10px] text-gray-500 leading-relaxed font-sans mt-1">{q.explanation}</p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Dynamic Custom Pagination Bar Footer */}
                  {totalQuestionsCount > 5 && (
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className="px-3.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 disabled:opacity-50 transition-colors"
                      >
                        Previous Page
                      </button>
                      <span className="text-xs text-gray-400 font-semibold">
                        Page {currentPage} of {Math.ceil(totalQuestionsCount / 5)}
                      </span>
                      <button
                        disabled={currentPage >= Math.ceil(totalQuestionsCount / 5)}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="px-3.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 disabled:opacity-50 transition-colors"
                      >
                        Next Page
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Toast message={toastMessage} type={toastType} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default Dashboard;