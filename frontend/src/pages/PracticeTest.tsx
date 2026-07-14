import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Question } from '../types';
import { Timer, Bookmark, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, Eye, RotateCcw, XCircle } from 'lucide-react';
import Toast, { ToastType } from '../components/Toast';

const API_BASE = 'https://neet-pyq-practice-platform.onrender.com/api';

const PracticeTest: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const isReviewMode = new URLSearchParams(location.search).get('mode') === 'review';

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [bookmarks, setBookmarks] = useState<Set<string | number>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(10800);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message: string, type: ToastType) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const activeQuestion = questions[currentIndex];

  useEffect(() => {
    const initializeTest = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const localKey = `neet_test_state_${type}_${id}`;
        const savedState = localStorage.getItem(localKey);

        if (savedState && !isReviewMode) {
          const parsed = JSON.parse(savedState);
          setQuestions(parsed.questions || []);
          setAnswers(parsed.answers || {});
          setBookmarks(new Set(parsed.bookmarks || []));
          setVisited(new Set(parsed.visited || [0]));
          setTimeLeft(parsed.timeLeft ?? 10800);
          setCurrentIndex(parsed.currentIndex || 0);
          setIsLoading(false);
        } else {
          let url = '';
          if (type === 'year') {
            url = `${API_BASE}/questions/${id}`;
          } else {
            url = `${API_BASE}/questions/random-test`;
          }
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error('Failed to download practice questions.');
          }
          const data = await response.json();
          if (!data.questions || data.questions.length === 0) {
            throw new Error('No questions returned for this set.');
          }
          const loadedQuestions = data.questions;
          setQuestions(loadedQuestions);

          if (token) {
            try {
              const bResponse = await fetch(`${API_BASE}/bookmarks`, {
                headers: { 'Authorization': `Bearer ${token}` }
              });
              if (bResponse.ok) {
                const bData = await bResponse.json();
                const initialBookmarks = new Set<string | number>();
                (bData.bookmarks || []).forEach((bid: string | number) => {
                  if (loadedQuestions.some((q: Question) => q.id.toString() === bid.toString())) {
                    initialBookmarks.add(bid);
                  }
                });
                setBookmarks(initialBookmarks);
              }
            } catch (bErr) {
              console.error('Failed to pre-fetch bookmarks:', bErr);
            }
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to start test.');
        setIsLoading(false);
      }
    };
    initializeTest();
  }, [type, id, token, isReviewMode]);

  useEffect(() => {
    if (questions.length === 0 || isReviewMode) return;
    const stateToSave = { questions, answers, bookmarks: Array.from(bookmarks), visited: Array.from(visited), timeLeft, currentIndex };
    const localKey = `neet_test_state_${type}_${id}`;
    localStorage.setItem(localKey, JSON.stringify(stateToSave));
  }, [questions, answers, bookmarks, visited, timeLeft, currentIndex, type, id, isReviewMode]);

  useEffect(() => {
    if (isLoading || questions.length === 0 || isReviewMode) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleSubmitTest(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, questions, isReviewMode]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (opt: string) => {
    if (isReviewMode) return;
    if (!activeQuestion) return;
    setAnswers(prev => ({ ...prev, [activeQuestion.id.toString()]: opt }));
  };

  const handleClearSelection = () => {
    if (isReviewMode) return;
    if (!activeQuestion) return;
    setAnswers(prev => {
      const next = { ...prev };
      delete next[activeQuestion.id.toString()];
      return next;
    });
    setRevealedAnswers(prev => {
      const next = new Set(prev);
      next.delete(currentIndex);
      return next;
    });
  };

  const handleToggleBookmark = async () => {
    if (!activeQuestion) return;
    const qId = activeQuestion.id;
    const isBookmarked = bookmarks.has(qId);
    const nextBookmarks = new Set(bookmarks);
    if (isBookmarked) {
      nextBookmarks.delete(qId);
      triggerToast('Removed from test bookmarks.', 'info');
    } else {
      nextBookmarks.add(qId);
      triggerToast('Bookmarked for active review.', 'success');
    }
    setBookmarks(nextBookmarks);

    if (token) {
      try {
        const url = `${API_BASE}/bookmark/${qId}`;
        await fetch(url, {
          method: isBookmarked ? 'DELETE' : 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (err) {
        console.error('Failed to sync bookmark:', err);
      }
    }
  };

  const handleRevealAnswer = () => {
    setRevealedAnswers(prev => {
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setVisited(prev => new Set(prev).add(prevIdx));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setVisited(prev => new Set(prev).add(nextIdx));
    }
  };

  const handleCancelTest = () => {
    const localKey = `neet_test_state_${type}_${id}`;
    localStorage.removeItem(localKey);
    navigate('/');
  };

  const handleSubmitTest = (isAutoSubmit = false) => {
    if (timerRef.current) clearInterval(timerRef.current);
    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    questions.forEach(q => {
      const selected = answers[q.id.toString()];
      if (!selected) {
        unansweredCount += 1;
      } else if (selected.toUpperCase() === q.correct_answer.toUpperCase()) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    });

    const score = (correctCount * 4) - (wrongCount * 1);
    const totalPotentialScore = questions.length * 4;
    const percentage = Math.max(0, parseFloat(((score / totalPotentialScore) * 100).toFixed(1)));
    const totalAnswered = correctCount + wrongCount;
    const accuracy = totalAnswered > 0 ? parseFloat(((correctCount / totalAnswered) * 100).toFixed(1)) : 0;
    const timeTaken = 10800 - timeLeft;

    const finalResult = {
      correct: correctCount,
      wrong: wrongCount,
      unanswered: unansweredCount,
      score,
      percentage,
      accuracy,
      timeTaken,
      date: new Date().toLocaleDateString(),
      testType: type,
      year: type === 'year' ? parseInt(id || '2020') : undefined
    };

    localStorage.setItem('neet_latest_test_result', JSON.stringify(finalResult));
    const reviewData = { questions, answers, type, id };
    localStorage.setItem('neet_latest_test_review', JSON.stringify(reviewData));
    
    const localKey = `neet_test_state_${type}_${id}`;
    localStorage.removeItem(localKey);
    triggerToast(isAutoSubmit ? 'Time expired! Test Auto-Submitted.' : 'Test submitted successfully!', 'success');
    
    setTimeout(() => {
      navigate('/result');
    }, 1000);
  };

  const getStatusClass = (idx: number, qId: string | number) => {
    const isCurrent = idx === currentIndex;
    const isBookmarked = bookmarks.has(qId);
    const isAnswered = !!answers[qId.toString()];
    const isVisited = visited.has(idx);

    if (isCurrent) return 'ring-2 ring-blue-600 ring-offset-2 bg-blue-600 text-white';
    if (isBookmarked) return 'bg-amber-500 text-white';
    if (isAnswered) return 'bg-emerald-600 text-white';
    if (isVisited) return 'bg-gray-200 text-gray-700';
    return 'bg-white border border-gray-200 text-gray-500';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-gray-600 font-medium">Assembling Question Sheet...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !activeQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xs max-w-md w-full text-center">
          <div className="w-12 h-12 bg-red-50 text-red-500 flex items-center justify-center rounded-full mx-auto mb-4">
            <XCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Error Loading practice test</h2>
          <p className="text-xs text-gray-500 mt-2">{errorMessage || 'Requested paper could not be built.'}</p>
          <button onClick={() => navigate('/')} className="mt-6 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      <div className="bg-white border-b border-gray-100 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCancelModal(true)} className="p-1.5 text-gray-400 hover:text-gray-900 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-gray-900 uppercase tracking-tight">
              {type === 'year' ? `NEET PYQ ${id} Exam` : 'Random Practice Mock Test'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-xl">
              <Timer className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-mono font-bold text-gray-700">{formatTime(timeLeft)}</span>
            </div>
            <button 
              onClick={() => handleSubmitTest(false)} 
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-600 rounded">{activeQuestion.subject}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-gray-50 text-gray-500 rounded">{activeQuestion.chapter}</span>
              </div>
              <button onClick={handleToggleBookmark} className={`p-2 rounded-xl border ${bookmarks.has(activeQuestion.id) ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-white text-gray-400'}`}>
                <Bookmark className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-base font-bold text-gray-900 leading-relaxed">
              <span className="font-mono text-gray-400 mr-2">Q.{currentIndex + 1}</span>
              {activeQuestion.question}
            </h3>

            <div className="grid grid-cols-1 gap-3">
              {[
                { key: 'A', text: activeQuestion.option_a },
                { key: 'B', text: activeQuestion.option_b },
                { key: 'C', text: activeQuestion.option_c },
                { key: 'D', text: activeQuestion.option_d }
              ].map(opt => {
                const isSelected = answers[activeQuestion.id.toString()] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelectOption(opt.key)}
                    className={`w-full text-left px-4 py-3 border rounded-xl text-sm flex items-center gap-3 transition-all ${
                      isSelected 
                        ? 'bg-blue-50 border-blue-400 text-blue-800 font-semibold shadow-sm' 
                        : 'border-gray-100 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                    }`}>{opt.key}</span>
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
              <button onClick={handleClearSelection} className="text-xs text-gray-400 hover:text-gray-600 font-semibold">
                Clear Selection
              </button>
              <div className="flex gap-3">
                <button disabled={currentIndex === 0} onClick={handlePrev} className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 disabled:opacity-40">
                  Previous
                </button>
                <button disabled={currentIndex === questions.length - 1} onClick={handleNext} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold">
                  Next Question
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-xs max-h-[480px] flex flex-col">
          <h4 className="text-xs font-bold text-gray-900 mb-4 uppercase tracking-wider">Question Sheet Palette</h4>
          <div className="grid grid-cols-5 gap-2 overflow-y-auto p-1 flex-1">
            {questions.map((q, idx) => (
              <button key={q.id} onClick={() => setCurrentIndex(idx)} className={`h-9 w-9 text-center text-xs font-bold font-mono rounded-lg transition-all ${getStatusClass(idx, q.id)}`}>
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900">Are you sure?</h3>
            <p className="text-xs text-gray-500">Your test progress and answers will be cleared.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowCancelModal(false)} className="flex-1 py-2 bg-gray-100 rounded-xl text-xs">Resume Exam</button>
              <button onClick={handleCancelTest} className="flex-1 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold">Cancel Test</button>
            </div>
          </div>
        </div>
      )}

      <Toast message={toastMessage} type={toastType} isVisible={showToast} onClose={() => setShowToast(false)} />
    </div>
  );
};

export default PracticeTest;