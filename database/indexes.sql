-- Performance Database Indexes for NEET PYQ Practice Platform

-- Indexes for Questions Table (Queries and Filtering)
CREATE INDEX IF NOT EXISTS idx_questions_year ON questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_chapter ON questions(chapter);
CREATE INDEX IF NOT EXISTS idx_questions_subject_chapter ON questions(subject, chapter);

-- Composite Index for fast year-specific paper loads (180 questions)
CREATE INDEX IF NOT EXISTS idx_questions_year_number ON questions(year, question_number);

-- Indexes for Bookmarks Table (Fast user lookup)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_question ON bookmarks(question_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_question ON bookmarks(user_id, question_id);

-- GIN Index for text-based search optimizations
CREATE INDEX IF NOT EXISTS idx_questions_search_vector ON questions USING gin(to_tsvector('english', question));
