-- Row Level Security (RLS) Policies for Supabase

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- 1. Policies for Questions Table
-- Questions are publicly readable by any candidate
CREATE POLICY "Allow public read access to questions"
ON questions FOR SELECT
TO anon, authenticated
USING (true);

-- 2. Policies for Users Table
-- Users can only view or manage their own profile details
CREATE POLICY "Allow users to select their own profile"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Allow users to update their own profile"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. Policies for Bookmarks Table
-- Bookmarks are strictly private to each candidate
CREATE POLICY "Allow users to read their own bookmarks"
ON bookmarks FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow users to create their own bookmarks"
ON bookmarks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to delete their own bookmarks"
ON bookmarks FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
