import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TestResult } from '../types';
import { 
  Trophy, CheckCircle, XCircle, AlertCircle, Clock, Percent, Target, 
  RotateCcw, ArrowRight, LayoutDashboard, Share2, Eye
} from 'lucide-react';
import Toast, { ToastType } from '../components/Toast';

const Result: React.FC = () => {
  const navigate = useNavigate();
  const [result, setResult] = useState<TestResult | null>(null);

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
    const saved = localStorage.getItem('neet_latest_test_result');
    if (saved) {
      setResult(JSON.parse(saved));
    } else {
      triggerToast('No recent results found. Redirecting to dashboard...', 'info');
      setTimeout(() => {
        navigate('/');
      }, 1500);
    }
  }, [navigate]);

  // Format seconds to Hh Mm Ss
  const formatSeconds = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;

    let output = '';
    if (hrs > 0) output += `${hrs}h `;
    if (mins > 0) output += `${mins}m `;
    output += `${secs}s`;
    return output;
  };

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sm text-gray-500">Compiling Report Sheet...</p>
        </div>
      </div>
    );
  }

  // Set visual color rating based on score percentage
  const getRatingTheme = (pct: number) => {
    if (pct >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', textAccent: 'text-emerald-700', rating: 'Excellent Performance! Ready for NEET.' };
    if (pct >= 55) return { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', textAccent: 'text-blue-700', rating: 'Good Progress. Target weak chapters next.' };
    return { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', textAccent: 'text-amber-700', rating: 'Needs Improvement. Focus on concept reviews.' };
  };

  const theme = getRatingTheme(result.percentage);

  return (
    <div className="min-h-screen bg-gray-50/50 pb-16 pt-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Score Header and Badge */}
        <div className="bg-white border border-gray-100 rounded-2xl p-6 md:p-8 shadow-xs relative overflow-hidden mb-6 text-center">
          {/* Decorative background shape */}
          <div className="absolute top-0 right-0 transform translate-x-12 -translate-y-12 w-40 h-40 bg-blue-50 rounded-full opacity-50"></div>

          <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
            <Trophy className="w-7 h-7" />
          </div>

          <span className="text-xs font-bold font-mono text-gray-400 uppercase tracking-widest">PRACTICE COMPLETED</span>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-sans tracking-tight mt-1">
            Exam Performance Summary
          </h2>
          <p className={`mt-3 text-sm font-semibold px-3 py-1.5 rounded-full inline-block ${theme.bg} ${theme.text} border ${theme.border}`}>
            {theme.rating}
          </p>

          {/* Large dynamic Score Display */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-gray-100">
            <div className="text-center p-4 rounded-xl bg-gray-50/50 border border-gray-100/50">
              <span className="text-xs text-gray-500 font-medium font-sans">Final Score</span>
              <div className="text-3xl font-black text-gray-900 mt-1">
                {result.score} <span className="text-xs font-semibold text-gray-400">/ 720</span>
              </div>
            </div>
            
            <div className="text-center p-4 rounded-xl bg-gray-50/50 border border-gray-100/50">
              <span className="text-xs text-gray-500 font-medium font-sans">Percentage Score</span>
              <div className="text-3xl font-black text-blue-600 mt-1 flex items-center justify-center gap-1">
                <Percent className="w-6 h-6 text-blue-500" />
                {result.percentage}%
              </div>
            </div>

            <div className="text-center p-4 rounded-xl bg-gray-50/50 border border-gray-100/50">
              <span className="text-xs text-gray-500 font-medium font-sans">Answering Accuracy</span>
              <div className="text-3xl font-black text-emerald-600 mt-1 flex items-center justify-center gap-1">
                <Target className="w-6 h-6 text-emerald-500" />
                {result.accuracy}%
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Correct</span>
              <span className="text-base font-bold text-gray-900">{result.correct} Qs</span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Wrong</span>
              <span className="text-base font-bold text-gray-900">{result.wrong} Qs</span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 bg-gray-50 text-gray-500 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Unanswered</span>
              <span className="text-base font-bold text-gray-900">{result.unanswered} Qs</span>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Time Taken</span>
              <span className="text-base font-bold text-gray-900">{formatSeconds(result.timeTaken)}</span>
            </div>
          </div>
        </div>

        {/* Action Triggers footer */}
        <div className="flex flex-wrap gap-3 items-center justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 rounded-xl font-semibold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm shadow-xs cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4" />
            Return to Dashboard
          </button>

          <button
            onClick={() => {
              const reviewYear = result.year || 'all';
              navigate(`/practice/${result.testType}/${reviewYear}?mode=review`);
            }}
            className="px-6 py-3 rounded-xl font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-all flex items-center gap-2 text-sm shadow-sm shadow-emerald-200 cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            Review Answers
          </button>
          
          <button
            onClick={() => {
              if (result.testType === 'year') {
                navigate(`/practice/year/${result.year}`);
              } else {
                navigate('/practice/random/all');
              }
            }}
            className="px-6 py-3 rounded-xl font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-2 text-sm shadow-sm shadow-blue-200 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Attempt Again
          </button>
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

export default Result;
