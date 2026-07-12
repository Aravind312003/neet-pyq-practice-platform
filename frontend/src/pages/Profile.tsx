import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Question } from '../types';
import { 
  User, Mail, Calendar, Bookmark, Trash2, BookOpen, ChevronDown, ChevronUp, AlertCircle 
} from 'lucide-react';
import Toast, { ToastType } from '../components/Toast';

const Profile: React.FC = () => {
  const { user, token } = useAuth();

  // States
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Question[]>([]);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  
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
    const fetchBookmarksAndDetails = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // 1. Fetch bookmarked IDs
        const res = await fetch('/api/bookmarks', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load bookmarks.');

        const data = await res.json();
        const ids: string[] = data.bookmarks || [];
        setBookmarks(ids);

        if (ids.length === 0) {
          setBookmarkedQuestions([]);
          setIsLoading(false);
          return;
        }

        // 2. Fetch full question details for all IDs concurrently
        const questionPromises = ids.map(async (id) => {
          try {
            const qRes = await fetch(`/api/question/${id}`);
            if (qRes.ok) {
              const qData = await qRes.json();
              return qData.question;
            }
          } catch (err) {
            console.error(`Failed to fetch question ${id}:`, err);
          }
          return null;
        });

        const results = await Promise.all(questionPromises);
        const validQuestions = results.filter((q): q is Question => q !== null);
        setBookmarkedQuestions(validQuestions);
      } catch (err: any) {
        triggerToast(err.message || 'Failed to load profile details.', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookmarksAndDetails();
  }, [token]);

  const handleDeleteBookmark = async (id: string | number) => {
    if (!token) return;
    setIsDeleting(id);
    try {
      const res = await fetch(`/api/bookmark/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error('Failed to remove bookmark.');
      }

      // Update state
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

  const toggleExpand = (id: string | number) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16 pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Profile Card Header */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs mb-8 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
          {/* Decorative background shape */}
          <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-36 h-36 bg-blue-50 rounded-full opacity-40"></div>

          <div className="w-16 h-16 rounded-full bg-blue-600 text-white font-black text-xl flex items-center justify-center border-2 border-blue-700 shadow-md">
            {user?.name.substring(0, 2).toUpperCase()}
          </div>

          <div className="text-center sm:text-left relative z-10">
            <h1 className="text-xl font-bold text-gray-900 font-sans tracking-tight">{user?.name}</h1>
            <div className="mt-1.5 flex flex-wrap justify-center sm:justify-start gap-4 text-xs text-gray-500 font-medium">
              <span className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5" />
                {user?.email}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Registered Candidate
              </span>
            </div>
          </div>
        </div>

        {/* Saved Bookmarks List */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Bookmark className="w-5 h-5 text-blue-600 fill-current" />
            <h2 className="text-lg font-bold text-gray-900 font-sans tracking-tight">
              Review Saved Bookmarks ({bookmarkedQuestions.length})
            </h2>
          </div>

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
                    {/* Accordion Trigger Header */}
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
                          className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
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

                    {/* Expandable Body */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-gray-50 space-y-4 bg-gray-50/20">
                        {/* Question Text */}
                        <div className="text-sm font-semibold text-gray-800 leading-relaxed whitespace-pre-line">
                          {q.question}
                        </div>

                        {/* Options */}
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

                        {/* Explanation block */}
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
