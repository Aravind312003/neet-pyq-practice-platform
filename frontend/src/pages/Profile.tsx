import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Question } from '../types';
import { 
  User, Mail, Calendar, Bookmark, Trash2, ChevronDown, ChevronUp, Flag, MessageSquare
} from 'lucide-react';
import Toast, { ToastType } from '../components/Toast';

// 🛑 Target Live Render Backend directly
const API_BASE = 'https://neet-pyq-practice-platform.onrender.com/api';

interface ReportItem {
  id: string;
  questionId: string | number;
  questionNumber: string | number;
  year: string | number;
  subject: string;
  chapter: string;
  issueType: string;
  description: string;
  userEmail: string;
  createdAt: string;
  questionDetails?: Question | null;
}

const Profile: React.FC = () => {
  const { user, token } = useAuth();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'reports'>('bookmarks');

  // States for Bookmarks
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Question[]>([]);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);

  // States for Reports
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [isDeletingReport, setIsDeletingReport] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | number | null>(null);

  // Toast System
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<ToastType>('success');
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (message: string, type: ToastType) => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);

      try {
        // 1. Fetch Bookmarks
        if (token) {
          const res = await fetch(`${API_BASE}/bookmarks`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            const ids: string[] = data.bookmarks || [];
            setBookmarks(ids);

            if (ids.length > 0) {
              const questionPromises = ids.map(async (id) => {
                try {
                  const qRes = await fetch(`${API_BASE}/questions/question/${id}`);
                  if (qRes.ok) {
                    return await qRes.json();
                  }
                } catch (err) {
                  console.error(`Failed to fetch question ${id}:`, err);
                }
                return null;
              });

              const results = await Promise.all(questionPromises);
              const validQuestions = results.filter((q): q is Question => q !== null);
              setBookmarkedQuestions(validQuestions);
            } else {
              setBookmarkedQuestions([]);
            }
          }
        }

        // 2. Fetch Reports
        const userEmail = user?.email || localStorage.getItem('neet_user_email') || '';
        const repUrl = userEmail 
          ? `${API_BASE}/reports?userEmail=${encodeURIComponent(userEmail)}`
          : `${API_BASE}/reports`;

        const repRes = await fetch(repUrl);
        if (repRes.ok) {
          const repData = await repRes.json();
          const rawReports = repData.reports || [];

          // Map database snake_case fields to frontend object keys
          const mappedReports: ReportItem[] = rawReports.map((r: any) => ({
            id: r.id || String(Math.random()),
            questionId: r.question_id || r.questionId || 'N/A',
            questionNumber: r.question_number || r.questionNumber || 'N/A',
            year: r.year || 'N/A',
            subject: r.subject || 'General',
            chapter: r.chapter || 'N/A',
            issueType: r.issue_type || r.issueType || 'Issue Report',
            description: r.description || '',
            userEmail: r.user_email || r.userEmail || '',
            createdAt: r.created_at || r.createdAt || new Date().toISOString()
          }));

          // Optionally enrich report entries with full question text details
          const enrichedReports = await Promise.all(
            mappedReports.map(async (rep) => {
              if (rep.questionId && rep.questionId !== 'N/A') {
                try {
                  const qRes = await fetch(`${API_BASE}/questions/question/${rep.questionId}`);
                  if (qRes.ok) {
                    const qData = await qRes.json();
                    return { ...rep, questionDetails: qData };
                  }
                } catch (e) {
                  // Fallback without full question structure
                }
              }
              return rep;
            })
          );

          setReports(enrichedReports);
        }
      } catch (err: any) {
        triggerToast(err.message || 'Failed to load details.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, [token, user]);

  const handleDeleteBookmark = async (id: string | number) => {
    if (!token) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`${API_BASE}/bookmark/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to remove bookmark.');
      }

      setBookmarks(prev => prev.filter(bid => bid.toString() !== id.toString()));
      setBookmarkedQuestions(prev => prev.filter(q => q.id.toString() !== id.toString()));
      if (expandedId === id) setExpandedId(null);
      
      triggerToast('Question removed from bookmarks.', 'success');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete bookmark.', 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    setIsDeletingReport(reportId);
    try {
      const res = await fetch(`${API_BASE}/reports/${reportId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Failed to remove report.');
      }

      setReports(prev => prev.filter(r => r.id !== reportId));
      triggerToast('Report entry removed successfully.', 'success');
    } catch (err: any) {
      triggerToast(err.message || 'Failed to delete report.', 'error');
    } finally {
      setIsDeletingReport(null);
    }
  };

  const toggleExpand = (id: string | number) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const toggleExpandReport = (reportId: string) => {
    setExpandedReportId(prev => (prev === reportId ? null : reportId));
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16 pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile Card Header */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs mb-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-36 h-36 bg-blue-50 rounded-full opacity-40"></div>

          <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-black text-xl flex items-center justify-center border-2 border-blue-700 shadow-md">
            {user?.name ? user.name.substring(0, 2).toUpperCase() : 'ME'}
          </div>

          <div className="text-center sm:text-left relative z-10">
            <h1 className="text-xl font-bold text-gray-900 font-sans tracking-tight">{user?.name || 'NEET Candidate'}</h1>
            <div className="mt-1.5 flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {user?.email || localStorage.getItem('neet_user_email') || 'registered@candidate.com'}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Registered Candidate
              </span>
            </div>
          </div>
        </div>

        {/* Tab Selector: Saved Bookmarks vs Reported Questions */}
        <div className="flex border-b border-gray-200 mb-6 gap-6">
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`pb-3 flex items-center gap-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'bookmarks'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Bookmark className="w-4 h-4 fill-current" />
            <span>Saved Bookmarks ({bookmarkedQuestions.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`pb-3 flex items-center gap-2 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'reports'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Flag className="w-4 h-4 text-rose-600" />
            <span>Reported Questions ({reports.length})</span>
          </button>
        </div>

        {/* Tab 1: Saved Bookmarks List */}
        {activeTab === 'bookmarks' && (
          <div>
            {isLoading ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 flex flex-col items-center justify-center shadow-xs">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs text-gray-500">Compiling your bookmarks archive...</p>
              </div>
            ) : bookmarkedQuestions.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-4 text-gray-400">
                  <Bookmark className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 font-sans">No saved bookmarks</h3>
                <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  As you practice Yearly papers or Mock tests, you can bookmark tricky questions. They will appear here for you to revise later.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {bookmarkedQuestions.map((q) => {
                  const isExpanded = expandedId === q.id;
                  return (
                    <div 
                      key={q.id}
                      className={`bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden transition-all duration-200 ${
                        isExpanded ? 'ring-1 ring-blue-100 border-blue-200' : ''
                      }`}
                    >
                      <div 
                        onClick={() => toggleExpand(q.id)}
                        className="p-5 flex items-start gap-4 justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] font-bold font-mono uppercase bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md">
                              {q.subject}
                            </span>
                            <span className="text-[10px] font-bold font-mono text-gray-400">
                              NEET {q.year} • Q{q.question_number}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-relaxed">
                            {q.question}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBookmark(q.id);
                            }}
                            disabled={isDeleting === q.id}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove bookmark"
                          >
                            {isDeleting === q.id ? (
                              <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>

                          <div className="text-gray-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t border-gray-50 space-y-4 bg-gray-50/20">
                          <div className="text-sm font-semibold text-gray-800 leading-relaxed whitespace-pre-line">
                            {q.question}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {[
                              { key: 'A', text: q.option_a },
                              { key: 'B', text: q.option_b },
                              { key: 'C', text: q.option_c },
                              { key: 'D', text: q.option_d },
                            ].map(({ key, text }) => {
                              const isCorrect = key === q.correct_answer;
                              return (
                                <div 
                                  key={key}
                                  className={`p-3 rounded-lg border text-xs font-medium flex gap-2.5 leading-normal ${
                                    isCorrect 
                                      ? 'bg-emerald-50/50 border-emerald-200 text-emerald-800' 
                                      : 'bg-white border-gray-100 text-gray-600'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center font-bold font-mono text-[10px] shrink-0 ${
                                    isCorrect 
                                      ? 'bg-emerald-600 text-white' 
                                      : 'bg-gray-100 text-gray-500'
                                  }`}>
                                    {key}
                                  </span>
                                  <span>{text}</span>
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className="bg-blue-50/30 border border-blue-50 rounded-xl p-4 text-xs leading-relaxed text-gray-600">
                              <span className="font-bold text-blue-800 font-sans block mb-1">Answer Explanation:</span>
                              <p className="whitespace-pre-line">{q.explanation}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Reported Questions List */}
        {activeTab === 'reports' && (
          <div>
            {isLoading ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 flex flex-col items-center justify-center shadow-xs">
                <div className="w-8 h-8 border-3 border-rose-600 border-t-transparent rounded-full animate-spin mb-3"></div>
                <p className="text-xs text-gray-500">Fetching reported questions list...</p>
              </div>
            ) : reports.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl p-12 text-center shadow-xs">
                <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4 text-rose-500">
                  <Flag className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 font-sans">No reported questions</h3>
                <p className="mt-1 text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  When you report errors or answer key issues during practice tests, your reported items and text box comments will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((rep) => {
                  const isExpanded = expandedReportId === rep.id;
                  const formattedDate = new Date(rep.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <div 
                      key={rep.id}
                      className={`bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden transition-all duration-200 ${
                        isExpanded ? 'ring-1 ring-rose-200 border-rose-200' : ''
                      }`}
                    >
                      <div 
                        onClick={() => toggleExpandReport(rep.id)}
                        className="p-5 flex items-start gap-4 justify-between cursor-pointer hover:bg-gray-50/50 transition-colors"
                      >
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-bold font-mono bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-md border border-rose-100">
                              Question No: Q{rep.questionNumber}
                            </span>
                            <span className="text-[11px] font-bold font-mono bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-md border border-blue-100">
                              Year: NEET {rep.year}
                            </span>
                            <span className="text-[11px] font-semibold bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-md border border-gray-200">
                              {rep.issueType}
                            </span>
                            <span className="text-[10px] text-gray-400 font-mono">
                              {rep.subject} {rep.chapter !== 'N/A' ? `• ${rep.chapter}` : ''}
                            </span>
                          </div>

                          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs text-slate-800 font-sans leading-relaxed">
                            <div className="flex items-center gap-1.5 text-slate-500 font-bold text-[11px] mb-1">
                              <MessageSquare className="w-3.5 h-3.5 text-rose-500" />
                              <span>Your Note / Submitted Description:</span>
                            </div>
                            <p className="text-slate-900 font-medium whitespace-pre-line">
                              "{rep.description}"
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-gray-400 hidden sm:inline">
                            {formattedDate}
                          </span>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteReport(rep.id);
                            }}
                            disabled={isDeletingReport === rep.id}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Remove report entry"
                          >
                            {isDeletingReport === rep.id ? (
                              <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>

                          <div className="text-gray-400">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>

                      {isExpanded && rep.questionDetails && (
                        <div className="px-5 pb-5 pt-2 border-t border-gray-100 bg-slate-50/50 space-y-3">
                          <span className="text-xs font-bold text-gray-700 font-sans block">
                            Full Question Content:
                          </span>
                          <div className="text-xs font-semibold text-gray-800 leading-relaxed whitespace-pre-line bg-white p-3.5 rounded-xl border border-gray-200">
                            {rep.questionDetails.question}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {[
                              { key: 'A', text: rep.questionDetails.option_a },
                              { key: 'B', text: rep.questionDetails.option_b },
                              { key: 'C', text: rep.questionDetails.option_c },
                              { key: 'D', text: rep.questionDetails.option_d },
                            ].map(({ key, text }) => (
                              <div key={key} className="p-2.5 rounded-lg bg-white border border-gray-200 text-xs text-gray-700 flex gap-2">
                                <span className="font-bold text-gray-500 font-mono">{key}.</span>
                                <span>{text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

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

export default Profile;