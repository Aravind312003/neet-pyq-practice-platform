-- Database schema for NEET PYQ Practice Platform
-- Target: Supabase PostgreSQL Database

-- Enable UUID extension if not already present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Questions Table (Existing)
CREATE TABLE IF NOT EXISTS questions (
    id BIGSERIAL PRIMARY KEY,
    year INTEGER NOT NULL,
    question_number INTEGER NOT NULL,
    subject TEXT NOT NULL,
    chapter TEXT NOT NULL,
    question TEXT NOT NULL,
    option_a TEXT NOT NULL,
    option_b TEXT NOT NULL,
    option_c TEXT NOT NULL,
    option_d TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    CONSTRAINT unique_year_question_number UNIQUE (year, question_number)
);

-- Bookmarks Table
CREATE TABLE IF NOT EXISTS bookmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_id BIGINT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_question_bookmark UNIQUE (user_id, question_id)
);

-- Helper RPC for unique subjects
CREATE OR REPLACE FUNCTION get_unique_subjects()
RETURNS TABLE(subject TEXT) AS $$
BEGIN
    RETURN QUERY SELECT DISTINCT q.subject FROM questions q ORDER BY q.subject;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
