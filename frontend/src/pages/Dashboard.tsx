import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Trophy, BookOpen, Clock, Award, Bookmark, Play, HelpCircle, AlertCircle, ChevronRight, CheckCircle2, Search, ArrowRight, BookMarked, Check, X
} from 'lucide-react';
import Toast, { ToastType } from '../components/Toast';
import { Question } from '../types';

const Dashboard: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Stats from localStorage / APIs
  const [bookmarkCount, setBookmarkCount] = useState<number>(0);
  const [pastAttemptsCount, setPastAttemptsCount] = useState<number>(0);
  const [avgScore, setAvgScore] = useState<number>(0);

  // Filter & Search states for the Interactive Question Bank
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Dropdown lists
  const [subjectsList, setSubjectsList] = useState<string[]>(['Biology', 'Chemistry', 'Physics']);
  const [chaptersList, setChaptersList] = useState<string[]>([]);
  const [yearsList] = useState<number[]>([2025, 2024, 2023, 2022, 2021, 2020]);

  // Questions dynamic loading list
  const [interactiveQuestions, setInteractiveQuestions] = useState<Question[]>([]);
  const [totalQuestionsCount, setTotalQuestionsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isQuestionsLoading, setIsQuestionsLoading] = useState(false);

  // Answer checking state inside the Interactive list
  // Stores { [questionId]: { selected: string, isCorrect: boolean } }
  const [checkedAnswers, setCheckedAnswers] = useState<{ [key: string]: { selected: string; isCorrect: boolean } }>({});
  
  // Track bookmarked question IDs
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string | number>>(new Set());

  // Toast State
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message: string, type: ToastType) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Fetch initial profile stats and bookmarked IDs
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!token) return;
      try {
        const response = await fetch('/api/bookmarks', {
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

    // Past attempts stats
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

  // Fetch subjects & chapters list
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const subRes = await fetch('/api/subjects');
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

  // Fetch chapters when subject selection changes
  useEffect(() => {
    const fetchChapters = async () => {
      try {
        const url = selectedSubject ? `/api/chapters?subject=${encodeURIComponent(selectedSubject)}` : '/api/chapters';
        const chapRes = await fetch(url);
        if (chapRes.ok) {
          const chapData = await chapRes.json();
          setChaptersList(chapData.chapters || []);
        }
      } catch (err) {
        console.warn('Error fetching chapters:', err);
      }
    };
    setSelectedChapter(''); // reset chapter selection
    fetchChapters();
  }, [selectedSubject]);

  // Fetch questions for Interactive bank
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

        const res = await fetch(`/api/questions?${params.toString()}`);
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

  // Toggle bookmark in list
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
        const url = `/api/bookmark/${qId}`;
        await fetch(url, {
          method: isCurrentlyBookmarked ? 'DELETE' : 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Failed to toggle bookmark:', err);
      }
    }
  };

  // Check selected option in list interactive mode
  const handleSelectOptionInList = (question: Question, optionKey: string) => {
    const isCorrect = optionKey.toUpperCase() === question.correct_answer.toUpperCase();
    setCheckedAnswers(prev => ({
      ...prev,
      [question.id.toString()]: {
        selected: optionKey,
        isCorrect
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16 pt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Top Hero Panel - PRO SYSTEM ACTIVE & NEET Hub description */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
          {/* Decorative background shape */}
          <div className="absolute top-0 right-0 transform translate-x-16 -translate-y-16 w-48 h-48 bg-blue-50 rounded-full opacity-40"></div>

          <div className="relative z-10 space-y-3.5 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold font-sans text-emerald-700 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                ● PRO SYSTEM ACTIVE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight font-sans">
              NEET Previous Year Question Hub
            </h1>
            <p className="text-gray-500 text-xs md:text-sm leading-relaxed font-medium">
              Experience simulated high-pressure practice with precise 3-hour exam timers, smart bookmarking, and instant detailed solutions. Offline database failsafes are enabled.
            </p>
          </div>

          <div className="relative z-10 shrink-0">
            <button
              onClick={handleStartRandomTest}
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-100 transition-all flex items-center gap-2.5 cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 text-blue-100" />
              Random Mock Test (180 Qs)
            </button>
          </div>
        </div>

        {/* Practice Papers Section */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 font-sans tracking-tight">
              Select Year Practice Paper
            </h2>
            <span className="text-[10px] font-bold font-mono tracking-wider text-gray-400 bg-gray-100 border border-gray-200 px-3 py-1 rounded-full">
              NEET WEIGHTED: 180 QUESTIONS EACH
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {yearsList.map((year) => (
              <div 
                key={year}
                className="bg-white border border-gray-100 hover:border-blue-100 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex justify-between items-center"
              >
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold tracking-widest font-sans text-gray-400 uppercase">
                    NEET EXAM
                  </span>
                  <h3 className="text-2xl font-black text-gray-900 font-mono tracking-tight">
                    {year}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">
                    180 Questions
                  </p>
                </div>

                <button
                  onClick={() => handleStartYearTest(year)}
                  className="w-10 h-10 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-full flex items-center justify-center transition-all cursor-pointer shadow-xs"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Interactive NEET Question Bank Section */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-bold text-gray-900 font-sans tracking-tight">
                Interactive NEET Question Bank
              </h2>
              <span className="text-[9px] font-bold tracking-wider font-mono bg-blue-50 text-blue-600 px-2.5 py-1 rounded border border-blue-100">
                REAL-TIME SEARCH & FILTERS
              </span>
            </div>
            <span className="text-xs text-gray-400 font-semibold font-mono">
              Showing {totalQuestionsCount} Match{totalQuestionsCount === 1 ? '' : 'es'}
            </span>
          </div>

          {/* Filter Toolbar controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
            {/* Search Input */}
            <div className="relative md:col-span-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 pointer-events-none">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search question keywords, chapter..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-xs font-sans placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
              />
            </div>

            {/* Subject Selector */}
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-sans text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">All Subjects</option>
              {subjectsList.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>

            {/* Chapter Selector */}
            <select
              value={selectedChapter}
              onChange={(e) => {
                setSelectedChapter(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-sans text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">All Chapters</option>
              {chaptersList.map(chap => (
                <option key={chap} value={chap}>{chap}</option>
              ))}
            </select>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(e.target.value);
                setCurrentPage(1);
              }}
              className="py-2.5 px-3 border border-gray-200 rounded-xl text-xs font-sans text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">All Years</option>
              {yearsList.map(yr => (
                <option key={yr} value={yr.toString()}>{yr}</option>
              ))}
            </select>
          </div>

          {/* List of interactive filtered questions */}
          {isQuestionsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-gray-400 font-sans">Sifting through interactive database...</p>
            </div>
          ) : interactiveQuestions.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-gray-100 rounded-2xl">
              <BookMarked className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <h4 className="text-xs font-bold text-gray-900 font-sans">No matching questions found</h4>
              <p className="text-[11px] text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Try widening your search terms or selecting "All Chapters" from the filter dropdown toolbar.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {interactiveQuestions.map((q, idx) => {
                const questionIndex = (currentPage - 1) * 5 + idx + 1;
                const userChoice = checkedAnswers[q.id.toString()];
                const isBookmarked = bookmarkedIds.has(q.id.toString());

                return (
                  <div 
                    key={q.id}
                    className="border border-gray-100 hover:border-gray-200 bg-white rounded-2xl shadow-xs overflow-hidden flex flex-col md:flex-row transition-colors"
                  >
                    {/* Left Panel: Index indicator & Year */}
                    <div className="md:w-20 bg-gray-50/50 border-r border-r-gray-100 flex flex-row md:flex-col items-center justify-between md:justify-center p-3.5 md:py-6 text-center shrink-0">
                      <span className="text-xs md:text-sm font-bold text-gray-400 font-mono">
                        0. {questionIndex}
                      </span>
                      <span className="text-[10px] md:text-xs font-black text-gray-900 font-mono bg-white border border-gray-100 px-2.5 py-0.5 rounded-md">
                        {q.year}
                      </span>
                    </div>

                    {/* Right Panel: Badges, Statement, and Interactive Option buttons */}
                    <div className="flex-1 p-5 md:p-6 space-y-4 relative">
                      
                      {/* Badge info row */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded font-mono ${
                            q.subject.toLowerCase() === 'biology' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                            q.subject.toLowerCase() === 'chemistry' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                            'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {q.subject}
                          </span>
                          <span className="px-2 py-0.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border border-gray-100 rounded font-sans">
                            {q.chapter}
                          </span>
                        </div>

                        {/* Bookmark trigger icon */}
                        <button
                          onClick={() => handleToggleBookmarkInList(q.id)}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isBookmarked 
                              ? 'bg-amber-50 border-amber-200 text-amber-500' 
                              : 'bg-white border-gray-100 text-gray-400 hover:text-gray-900'
                          }`}
                          title="Bookmark tricky question"
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                        </button>
                      </div>

                      {/* Question Text */}
                      <p className="text-xs md:text-sm font-bold text-gray-800 leading-relaxed font-sans">
                        [NEET {q.year}] {q.question}
                      </p>

                      {/* Options List */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                        {[
                          { key: 'A', text: q.option_a },
                          { key: 'B', text: q.option_b },
                          { key: 'C', text: q.option_c },
                          { key: 'D', text: q.option_d }
                        ].map(opt => {
                          const isOptSelected = userChoice?.selected === opt.key;
                          const isCorrectOpt = opt.key.toUpperCase() === q.correct_answer.toUpperCase();
                          
                          let btnClass = 'border-gray-100 hover:border-gray-200 text-gray-600 hover:bg-gray-50/50';
                          let badgeClass = 'bg-gray-100 text-gray-500';

                          if (userChoice) {
                            if (isCorrectOpt) {
                              btnClass = 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold';
                              badgeClass = 'bg-emerald-600 text-white';
                            } else if (isOptSelected) {
                              btnClass = 'bg-rose-50 border-rose-300 text-rose-800 font-semibold';
                              badgeClass = 'bg-rose-600 text-white';
                            }
                          }

                          return (
                            <button
                              key={opt.key}
                              onClick={() => handleSelectOptionInList(q, opt.key)}
                              className={`w-full text-left px-3.5 py-2.5 border rounded-xl text-xs font-medium font-sans flex items-center gap-3 transition-all cursor-pointer ${btnClass}`}
                            >
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold font-mono text-[9px] shrink-0 ${badgeClass}`}>
                                {opt.key}
                              </span>
                              <span className="leading-tight">{opt.text}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Immediate learning solution reveal */}
                      {userChoice && q.explanation && (
                        <div className="bg-emerald-50/30 border border-emerald-50 rounded-xl p-3.5 text-[11px] leading-relaxed text-gray-600">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-800 mb-1">
                            {userChoice.isCorrect ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Correct selection!</span>
                              </>
                            ) : (
                              <>
                                <X className="w-3.5 h-3.5 text-rose-600" />
                                <span>Incorrect. Correct answer is Option {q.correct_answer}</span>
                              </>
                            )}
                          </div>
                          <p className="whitespace-pre-line text-gray-600">{q.explanation}</p>
                        </div>
                      )}

                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Simple Pagination Footer */}
          {totalQuestionsCount > 5 && (
            <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="px-3.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Previous Page
              </button>
              <span className="text-xs text-gray-400 font-sans font-semibold">
                Page {currentPage} of {Math.ceil(totalQuestionsCount / 5)}
              </span>
              <button
                disabled={currentPage >= Math.ceil(totalQuestionsCount / 5)}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="px-3.5 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors cursor-pointer"
              >
                Next Page
              </button>
            </div>
          )}
        </div>

      </div>

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default Dashboard;
