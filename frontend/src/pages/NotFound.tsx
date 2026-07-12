import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ArrowLeft } from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 text-center bg-white border border-gray-100 p-8 rounded-2xl shadow-xs">
        <div className="mx-auto h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
          <BookOpen className="w-6 h-6" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 font-sans">
            Page Not Found
          </h2>
          <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
            The page you are trying to visit does not exist or has been moved. Let's get you back to practicing.
          </p>
        </div>

        <button
          onClick={() => navigate('/')}
          className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-blue-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFound;
