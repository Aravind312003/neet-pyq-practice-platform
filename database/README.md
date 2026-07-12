# Supabase PostgreSQL Database Setup

This directory contains the SQL files to configure and optimize your Supabase PostgreSQL instance for the NEET PYQ Practice Platform.

## Setup Steps

1. **Schema Initialization**:
   Open the **SQL Editor** in your Supabase Dashboard and execute the contents of `schema.sql`. This will create the `users`, `questions`, and `bookmarks` tables and establish safe reference constraints.

2. **Row Level Security (RLS)**:
   Run `policies.sql` in the SQL Editor to activate secure access boundaries on all tables, ensuring user-specific data isolation.

3. **Performance Optimization & Indexing**:
   Run `indexes.sql` to optimize question retrieval times for paginated searches and large year-specific question sheets (180 questions).
