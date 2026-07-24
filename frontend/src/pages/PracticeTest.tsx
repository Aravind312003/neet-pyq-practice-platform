import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Question } from '../types';
import { 
  Timer, Bookmark, ChevronLeft, ChevronRight, CheckCircle2, AlertTriangle, XCircle, Flag, X, Send, AlertCircle
} from 'lucide-react';
import Toast, { ToastType } from '../components/Toast';

// Central API Base URL pointing to your live Render instance
const API_BASE = 'https://neet-pyq-practice-platform.onrender.com/api';

const PracticeTest: React.FC = () => {
  const { type, id } = useParams<{ type: string; id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();

  const isReviewMode = new URLSearchParams(location.search).get('mode') === 'review';

  // Test states
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [bookmarks, setBookmarks] = useState<Set<string | number>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [, setRevealedAnswers] = useState<Set<number>>(new Set());

  // Palette Filter
  const [showBookmarkedOnly, setShowBookmarkedOnly] = useState(false);

  // Loading and Error states
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Timer: 3 hours = 10800 seconds
  const [timeLeft, setTimeLeft] = useState<number>(10800);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Modal and Confirmation states
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Report Modal states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportIssueType, setReportIssueType] = useState('Wrong Answer Key');
  const [reportDescription, setReportDescription] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Toast System
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message: string, type: ToastType) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  const activeQuestion = questions[currentIndex];

  const handleOpenReport = () => {
    setReportIssueType('Wrong Answer Key');
    setReportDescription('');
    setReportError(null);
    setShowReportModal(true);
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDescription.trim()) {
      setReportError('Please describe the issue with this question.');
      return;
    }

    setIsSubmittingReport(true);
    setReportError(null);

    try {
      const userEmail = localStorage.getItem('neet_user_email') || 'User';
      const response = await fetch(`${API_BASE}/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          questionId: activeQuestion?.id,
          questionNumber: currentIndex + 1,
          year: activeQuestion?.year,
          subject: activeQuestion?.subject,
          chapter: activeQuestion?.chapter,
          issueType: reportIssueType,
          description: reportDescription,
          userEmail
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit report.');
      }

      triggerToast('Report submitted successfully! Thank you for your feedback.', 'success');
      setShowReportModal(false);
      setReportDescription('');
    } catch (err: any) {
      setReportError(err.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Sync Timer and Progress to localStorage on load/refresh
  useEffect(() => {
    const initializeTest = async () => {
      setIsLoading(true);
      try {
        if (isReviewMode) {
          const reviewKey = 'neet_latest_test_review';
          const savedReviewString = localStorage.getItem(reviewKey);
          if (savedReviewString) {
            try {
              const savedReview = JSON.parse(savedReviewString);
              setQuestions(savedReview.questions || []);
              setAnswers(savedReview.answers || {});
              setIsLoading(false);
              return;
            } catch (err) {
              console.error('Failed to parse saved review state:', err);
            }
          }
        }

        const localKey = `neet_test_state_${type}_${id}`;
        const savedStateString = localStorage.getItem(localKey);

        if (savedStateString) {
          const savedState = JSON.parse(savedStateString);
          setQuestions(savedState.questions);
          setAnswers(savedState.answers);
          setBookmarks(new Set(savedState.bookmarks));
          setVisited(new Set(savedState.visited));
          setTimeLeft(savedState.timeLeft);
          setCurrentIndex(savedState.currentIndex || 0);
          setIsLoading(false);
        } else {
          // Fetch fresh questions from API
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
          
          // Pre-populate bookmarks from user saved list if available
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

  // Auto-Save test state to localStorage whenever state changes
  useEffect(() => {
    if (questions.length === 0 || isReviewMode) return;

    const stateToSave = {
      questions,
      answers,
      bookmarks: Array.from(bookmarks),
      visited: Array.from(visited),
      timeLeft,
      currentIndex
    };

    const localKey = `neet_test_state_${type}_${id}`;
    localStorage.setItem(localKey, JSON.stringify(stateToSave));
  }, [questions, answers, bookmarks, visited, timeLeft, currentIndex, type, id, isReviewMode]);

  // Timer ticker loop
  useEffect(() => {
    if (isLoading || questions.length === 0 || isReviewMode) return;

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        const nextTime = prev - 1;

        if (nextTime === 1800) {
          triggerToast('⚠️ 30 Minutes Remain! Work efficiently.', 'info');
        } else if (nextTime === 600) {
          triggerToast('⚠️ 10 Minutes Remain! Double check your answering palette.', 'info');
        } else if (nextTime === 300) {
          triggerToast('🚨 CRITICAL WARNING: Only 5 Minutes Remain!', 'error');
        } else if (nextTime === 60) {
          triggerToast('🚨 FINAL WARNING: 1 Minute Remaining. Submit now!', 'error');
        }

        if (nextTime <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          triggerToast('⏰ TIME OVER! Auto-submitting your practice test.', 'info');
          handleSubmitTest(true);
          return 0;
        }

        return nextTime;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading, questions, isReviewMode]);

  // Mark current question as visited
  useEffect(() => {
    if (questions.length > 0) {
      setVisited(prev => {
        const next = new Set(prev);
        next.add(currentIndex);
        return next;
      });
    }
  }, [currentIndex, questions]);

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Select Option
  const handleSelectOption = (opt: string) => {
    if (isReviewMode) return;
    if (!activeQuestion) return;
    setAnswers(prev => ({
      ...prev,
      [activeQuestion.id.toString()]: opt
    }));
  };

  // Clear current question selection
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

  // Toggle Bookmark in session and persist to backend if online
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
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error('Failed to sync bookmark:', err);
      }
    }
  };

  // Jump to specific index from sidebar palette
  const handleJumpQuestion = (idx: number) => {
    setCurrentIndex(idx);
  };

  // Navigation handlers
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  // Cancel Practice Test
  const handleCancelTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    const localKey = `neet_test_state_${type}_${id}`;
    localStorage.removeItem(localKey);

    triggerToast('Practice test ended early. Compiling results for review...', 'info');

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

    setTimeout(() => {
      navigate('/result');
    }, 1000);
  };

  // Submit test and calculate final scores
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

    if (isAutoSubmit) {
      navigate('/result');
    } else {
      triggerToast('Test submitted successfully! Compiling score details...', 'success');
      setTimeout(() => {
        navigate('/result');
      }, 1000);
    }
  };

  // Determine palette state color matching requirements
  const getPaletteStatusColor = (idx: number) => {
    const q = questions[idx];
    const isCurrent = idx === currentIndex;
    const isAnswered = !!answers[q.id.toString()];
    const isBookmarked = bookmarks.has(q.id);
    const isVisited = visited.has(idx);

    if (isCurrent) return 'ring-2 ring-blue-600 ring-offset-2 bg-blue-600 text-white';
    if (isBookmarked) return 'bg-amber-500 text-white hover:bg-amber-600';
    if (isAnswered) return 'bg-emerald-600 text-white hover:bg-emerald-700';
    if (isVisited) return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
    return 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-gray-600 font-sans font-medium">Assembling NEET Question Sheet...</p>
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
          <h2 className="text-lg font-bold text-gray-900 font-sans">Error Loading Practice Exam</h2>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            {errorMessage || 'The requested practice paper was not found or is currently unavailable.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="mt-6 w-full py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const filteredPaletteIndexes = questions
    .map((q, idx) => ({ q, idx }))
    .filter(item => !showBookmarkedOnly || bookmarks.has(item.q.id));

  return (
    <div className="min-h-screen bg-gray-50/50 flex flex-col">
      {/* Sub-header/Timer Strip */}
      <div className="bg-white border-b border-gray-100 py-3.5 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-gray-900 font-sans">
              {type === 'year' ? `NEET ${id} Official Paper` : 'NEET Real-time Random Mock Paper'}
            </span>
            <span className="text-xs font-mono text-gray-400">|</span>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>

          {/* Timer / Review Badge */}
          {isReviewMode ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-100 bg-emerald-50/50 text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-sans font-bold">Review Mode</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-blue-100 bg-blue-50/50 text-blue-800">
              <Timer className="w-4 h-4 text-blue-600 animate-pulse" />
              <span className="text-sm font-mono font-bold tracking-wider">{formatTime(timeLeft)}</span>
            </div>
          )}

          <div className="flex gap-2">
            {isReviewMode ? (
              <button
                onClick={() => navigate('/result')}
                className="text-xs font-semibold px-3.5 py-1.5 bg-gray-100 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer flex items-center gap-1"
              >
                Back to Results
              </button>
            ) : (
              <>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-xs font-semibold px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Cancel Test
                </button>
                <button
                  onClick={() => handleSubmitTest(false)}
                  className="text-xs font-semibold px-3.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Submit Exam
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Responsive Two-Column Layout */}
      <div className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full">
        <div className="grid grid-cols-1 md:grid-cols-10 gap-6 items-start">
          
          {/* Active Question Card (70%) */}
          <div className="md:col-span-7">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-xs relative flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6 gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded">
                      {activeQuestion.subject}
                    </span>
                    <span className="px-2.5 py-0.5 text-xs font-semibold text-gray-600 bg-gray-50 border border-gray-100 rounded">
                      {activeQuestion.chapter}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleOpenReport}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors rounded-lg cursor-pointer"
                      title="Report an issue with this question"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>Report</span>
                    </button>

                    <button
                      onClick={handleToggleBookmark}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                        bookmarks.has(activeQuestion.id)
                          ? 'bg-amber-50 text-amber-500 border-amber-200'
                          : 'bg-white text-gray-400 border-gray-200 hover:text-gray-900'
                      }`}
                      title="Toggle Saved Bookmark"
                    >
                      <Bookmark className={`w-4.5 h-4.5 ${bookmarks.has(activeQuestion.id) ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                <h3 className="text-base md:text-lg font-bold text-gray-900 leading-relaxed font-sans mb-8">
                  <span className="text-blue-600 mr-2">Q{currentIndex + 1}.</span>
                  [NEET {activeQuestion.year}] {activeQuestion.question}
                </h3>

                <div className="space-y-3.5">
                  {[
                    { key: 'A', text: activeQuestion.option_a },
                    { key: 'B', text: activeQuestion.option_b },
                    { key: 'C', text: activeQuestion.option_c },
                    { key: 'D', text: activeQuestion.option_d }
                  ].map((opt) => {
                    const isSelected = answers[activeQuestion.id.toString()] === opt.key;
                    const isCorrect = opt.key === activeQuestion.correct_answer;

                    let optionClass = 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300';
                    let badgeClass = 'bg-gray-100 border border-gray-200 text-gray-500';

                    if (isReviewMode) {
                      if (isCorrect) {
                        optionClass = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium shadow-xs';
                        badgeClass = 'bg-emerald-600 text-white';
                      } else if (isSelected) {
                        optionClass = 'bg-red-50 border-red-400 text-red-900 font-medium shadow-xs';
                        badgeClass = 'bg-red-600 text-white';
                      }
                    } else {
                      if (isSelected) {
                        optionClass = 'bg-blue-50 border-blue-500 text-blue-900 font-semibold shadow-xs';
                        badgeClass = 'bg-blue-600 text-white';
                      }
                    }

                    return (
                      <button
                        key={opt.key}
                        onClick={() => !isReviewMode && handleSelectOption(opt.key)}
                        disabled={isReviewMode}
                        className={`w-full text-left p-4 rounded-xl border text-sm font-sans flex items-center gap-4 transition-all ${
                          isReviewMode ? 'cursor-default' : 'cursor-pointer'
                        } ${optionClass}`}
                      >
                        <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-colors shrink-0 ${badgeClass}`}>
                          {opt.key}
                        </span>
                        <span>{opt.text}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {isReviewMode && (
                <div className="mt-8 p-5 bg-emerald-50/50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-2 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-bold text-sm">Correct Answer: {activeQuestion.correct_answer}</span>
                  </div>
                  <p className="text-xs text-emerald-950 font-sans leading-relaxed whitespace-pre-line">
                    <span className="font-bold">Explanation:</span> {activeQuestion.explanation}
                  </p>
                </div>
              )}

              <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap gap-3 items-center justify-between">
                <div className="flex gap-2">
                  {!isReviewMode ? (
                    <button
                      onClick={handleClearSelection}
                      className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 italic font-semibold">Reviewing answers</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handlePrev}
                    disabled={currentIndex === 0}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={currentIndex === questions.length - 1}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Question Palette container (30%) */}
          <div className="md:col-span-3 md:sticky md:top-24">
            <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h4 className="font-bold text-gray-900 font-sans text-sm">
                  Question Palette
                </h4>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="bookmarkedOnly"
                    checked={showBookmarkedOnly}
                    onChange={(e) => setShowBookmarkedOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
                  />
                  <label htmlFor="bookmarkedOnly" className="text-xs font-bold text-gray-600 select-none cursor-pointer">
                    Show Bookmarks Only
                  </label>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pb-1 text-xs font-semibold text-gray-500 font-sans">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-600" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-amber-500" />
                  <span>Bookmarked</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-gray-200" />
                  <span>Visited</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-white border border-gray-200" />
                  <span>Not Visited</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded ring-2 ring-blue-600 ring-offset-2 bg-blue-600" />
                  <span>Active Selection</span>
                </div>
              </div>

              <div className="pt-2">
                {filteredPaletteIndexes.length === 0 ? (
                  <div className="py-6 text-center text-xs text-gray-400 font-sans">
                    No questions match your active filters.
                  </div>
                ) : (
                  <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {filteredPaletteIndexes.map(({ q, idx }) => (
                      <button
                        key={q.id}
                        onClick={() => handleJumpQuestion(idx)}
                        className={`h-9 w-full rounded-lg text-xs font-bold font-mono transition-all flex items-center justify-center cursor-pointer ${getPaletteStatusColor(idx)}`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Test Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-100 max-w-md w-full p-6 text-center shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-red-100 text-red-600 flex items-center justify-center rounded-full mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 font-sans">Are you sure?</h3>
            <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
              Your test timer will stop and all unsaved exam answers, bookmarks, and visited tracking data will be completely cleared.
            </p>

            <div className="pt-2 flex gap-3 w-full justify-center">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-gray-200"
              >
                Continue Exam
              </button>
              <button
                onClick={handleCancelTest}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
              >
                Cancel Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Question Issue Modal */}
      {showReportModal && activeQuestion && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full p-6 relative overflow-hidden">
            
            <div className="flex justify-between items-start pb-3.5 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 shrink-0">
                  <Flag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900 font-sans">
                    Report Question Issue
                  </h3>
                  <p className="text-xs text-gray-500 font-sans">
                    Found an error? Let us know so we can fix it
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 mb-4 space-y-2 text-xs font-sans">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-slate-800 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs">
                  Question No: Q{currentIndex + 1}
                </span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  Year: NEET {activeQuestion.year}
                </span>
                <span className="font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200/60">
                  {activeQuestion.subject} • {activeQuestion.chapter}
                </span>
              </div>
              <p className="text-slate-700 line-clamp-2 pt-2 border-t border-slate-200/60 font-medium text-[12px] leading-relaxed">
                "{activeQuestion.question}"
              </p>
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 font-sans">
                  Issue Category
                </label>
                <select
                  value={reportIssueType}
                  onChange={(e) => setReportIssueType(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Wrong Answer Key">Wrong Answer Key / Incorrect Option Marked</option>
                  <option value="Typo or Formatting Error">Typo or Formatting Error in Question/Options</option>
                  <option value="Incorrect Explanation">Incorrect or Unclear Explanation</option>
                  <option value="Missing Content / Options">Missing Content or Options</option>
                  <option value="Other Issue">Other Issue</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 font-sans">
                  Describe the Issue <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={reportDescription}
                  onChange={(e) => {
                    setReportDescription(e.target.value);
                    if (reportError) setReportError(null);
                  }}
                  placeholder="Mention what is wrong with this question or option answer key..."
                  className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-xs font-sans text-gray-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400 resize-none"
                />
              </div>

              {reportError && (
                <div className="flex items-center gap-2 text-xs text-rose-600 font-medium bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reportError}</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport}
                  className="px-4.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isSubmittingReport ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Report</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toast
        message={toastMessage}
        type={toastType}
        isVisible={showToast}
        onClose={() => setShowToast(false)}
      />
    </div>
  );
};

export default PracticeTest;