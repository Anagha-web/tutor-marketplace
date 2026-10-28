-- Safe starter subjects. Idempotent: existing rows (matched by slug) are never overwritten.
-- Run once in the Supabase SQL editor, or automatically via `supabase db reset` locally.
insert into public.subjects (name, slug, description) values
  ('Mathematics', 'mathematics', 'Arithmetic, algebra, geometry, calculus and exam preparation.'),
  ('Physics', 'physics', 'Mechanics, electricity, waves and modern physics.'),
  ('Chemistry', 'chemistry', 'Organic, inorganic and physical chemistry.'),
  ('Biology', 'biology', 'Cell biology, genetics, ecology and human biology.'),
  ('English', 'english', 'Reading, writing, grammar and literature.'),
  ('Computer Science', 'computer-science', 'Programming, algorithms and computing fundamentals.'),
  ('Spanish', 'spanish', 'Conversation, grammar and exam preparation.'),
  ('French', 'french', 'Conversation, grammar and exam preparation.'),
  ('History', 'history', 'World, regional and modern history.'),
  ('Economics', 'economics', 'Micro and macroeconomics.'),
  ('Music', 'music', 'Theory, piano, guitar and voice.'),
  ('Test Prep', 'test-prep', 'SAT, ACT, GRE, IELTS and other standardised tests.')
on conflict (slug) do nothing;
