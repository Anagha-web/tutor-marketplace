/**
 * SAMPLE DATA — fictional people and details used only when Supabase is not configured
 * (demo mode). Every item is flagged `isDemo` and the UI labels it as sample content.
 * It is never written to, or mixed with, real database records.
 */
import type { PublicTutor, Subject, SubjectRef } from '../lib/types';

export const demoSubjects: Subject[] = [
  ['Mathematics', 'mathematics', 'Arithmetic, algebra, geometry, calculus and exam preparation.'],
  ['Physics', 'physics', 'Mechanics, electricity, waves and modern physics.'],
  ['Chemistry', 'chemistry', 'Organic, inorganic and physical chemistry.'],
  ['Biology', 'biology', 'Cell biology, genetics, ecology and human biology.'],
  ['English', 'english', 'Reading, writing, grammar and literature.'],
  ['Computer Science', 'computer-science', 'Programming, algorithms and computing fundamentals.'],
  ['Spanish', 'spanish', 'Conversation, grammar and exam preparation.'],
  ['French', 'french', 'Conversation, grammar and exam preparation.'],
  ['History', 'history', 'World, regional and modern history.'],
  ['Economics', 'economics', 'Micro and macroeconomics.'],
  ['Music', 'music', 'Theory, piano, guitar and voice.'],
  ['Test Prep', 'test-prep', 'SAT, ACT, GRE, IELTS and other standardised tests.'],
].map(([name, slug, description]) => ({ id: `demo-${slug}`, name, slug, description, is_active: true }));

const s = (...slugs: string[]): SubjectRef[] =>
  slugs.map((slug) => {
    const subject = demoSubjects.find((x) => x.slug === slug)!;
    return { id: subject.id, name: subject.name, slug: subject.slug };
  });

const tutor = (t: Omit<PublicTutor, 'isDemo' | 'avatar_url'>): PublicTutor => ({ ...t, avatar_url: null, isDemo: true });

export const demoTutors: PublicTutor[] = [
  tutor({
    id: 'demo-priya-raman',
    display_name: 'Priya Raman',
    headline: 'Calm, structured maths support from algebra to calculus',
    bio: 'I help secondary and early university students turn "I don\'t get it" into "I can do this". Lessons start with what you already know, then build step by step with worked examples and short practice sets you can repeat on your own.',
    qualifications: 'Sample: MSc Applied Mathematics. Sample: PGCE Secondary Mathematics.',
    experience_years: 9,
    hourly_rate: 45,
    teaching_mode: 'both',
    location: 'Manchester',
    subjects: s('mathematics', 'test-prep'),
  }),
  tutor({
    id: 'demo-daniel-okafor',
    display_name: 'Daniel Okafor',
    headline: 'Physics and chemistry made visual and practical',
    bio: 'I use diagrams, simulations and everyday examples to make physical science intuitive. I am especially comfortable supporting students who feel anxious about exams or have fallen behind and want a fresh start.',
    qualifications: 'Sample: BSc Physics. Sample: Former secondary science teacher.',
    experience_years: 7,
    hourly_rate: 40,
    teaching_mode: 'online',
    location: '',
    subjects: s('physics', 'chemistry'),
  }),
  tutor({
    id: 'demo-sofia-martinez',
    display_name: 'Sofía Martínez',
    headline: 'Conversational Spanish for travel, work and exams',
    bio: 'Native Spanish speaker focusing on confident conversation. Each lesson mixes speaking practice with the grammar you actually need, plus short listening exercises tailored to your goals and level.',
    qualifications: 'Sample: BA Modern Languages. Sample: Certificate in teaching Spanish as a foreign language.',
    experience_years: 5,
    hourly_rate: 30,
    teaching_mode: 'online',
    location: '',
    subjects: s('spanish'),
  }),
  tutor({
    id: 'demo-james-whitaker',
    display_name: 'James Whitaker',
    headline: 'Essay writing, literature and English language',
    bio: 'I help students plan, draft and polish essays with clear arguments. We read closely, annotate together and practise timed responses so writing under exam conditions feels manageable rather than stressful.',
    qualifications: 'Sample: MA English Literature.',
    experience_years: 12,
    hourly_rate: 50,
    teaching_mode: 'in_person',
    location: 'Bristol',
    subjects: s('english', 'history'),
  }),
  tutor({
    id: 'demo-mei-chen',
    display_name: 'Mei Chen',
    headline: 'Learn to code with Python and JavaScript projects',
    bio: 'From first programs to data structures, I teach programming through small projects you will be proud of. I also support computer science coursework and help students build good debugging habits early.',
    qualifications: 'Sample: BSc Computer Science. Sample: 6 years as a software engineer.',
    experience_years: 6,
    hourly_rate: 55,
    teaching_mode: 'online',
    location: '',
    subjects: s('computer-science', 'mathematics'),
  }),
  tutor({
    id: 'demo-amara-nwosu',
    display_name: 'Amara Nwosu',
    headline: 'Biology tutoring with memorable explanations',
    bio: 'I make biology stick using diagrams, analogies and active recall. Sessions include exam-style questions with feedback so you can see exactly where marks are gained and lost, and how to fix it.',
    qualifications: 'Sample: BSc Biomedical Science.',
    experience_years: 4,
    hourly_rate: 35,
    teaching_mode: 'both',
    location: 'Birmingham',
    subjects: s('biology', 'chemistry'),
  }),
  tutor({
    id: 'demo-luc-bernard',
    display_name: 'Luc Bernard',
    headline: 'French conversation and grammar for all levels',
    bio: 'Friendly, patient French lessons focused on speaking from day one. I adapt to children, teenagers and adults and can help with school exams, relocation preparation or simply rediscovering the language.',
    qualifications: 'Sample: Native speaker. Sample: Licence in French Literature.',
    experience_years: 8,
    hourly_rate: 38,
    teaching_mode: 'online',
    location: '',
    subjects: s('french'),
  }),
  tutor({
    id: 'demo-hannah-cole',
    display_name: 'Hannah Cole',
    headline: 'Economics and business made clear',
    bio: 'I connect economic theory to real news stories so concepts like inflation, elasticity and market failure finally make sense. Ideal for school and first-year university students preparing for exams.',
    qualifications: 'Sample: MSc Economics.',
    experience_years: 3,
    hourly_rate: 32,
    teaching_mode: 'in_person',
    location: 'Leeds',
    subjects: s('economics'),
  }),
  tutor({
    id: 'demo-arjun-mehta',
    display_name: 'Arjun Mehta',
    headline: 'Piano and music theory for beginners to grade 8',
    bio: 'I teach piano with a balance of technique, theory and pieces you enjoy playing. Lessons are relaxed but structured, with clear weekly practice goals and plenty of encouragement along the way.',
    qualifications: 'Sample: BMus Performance.',
    experience_years: 10,
    hourly_rate: 42,
    teaching_mode: 'both',
    location: 'London',
    subjects: s('music'),
  }),
  tutor({
    id: 'demo-grace-lee',
    display_name: 'Grace Lee',
    headline: 'IELTS and academic English coaching',
    bio: 'I coach students aiming for university admission or professional registration. We focus on test strategy, timed practice and targeted feedback for writing and speaking so progress is measurable week to week.',
    qualifications: 'Sample: CELTA. Sample: MA Applied Linguistics.',
    experience_years: 6,
    hourly_rate: 36,
    teaching_mode: 'online',
    location: '',
    subjects: s('english', 'test-prep'),
  }),
];

/** Clearly labelled sample testimonials for marketing sections. */
export const sampleTestimonials = [
  {
    quote: 'Booking a tutor took minutes, and I could compare subjects and prices before sending a request.',
    name: 'Sample student',
    detail: 'Illustrative example',
  },
  {
    quote: 'Having my own profile and request inbox makes it easy to manage new students alongside my other work.',
    name: 'Sample tutor',
    detail: 'Illustrative example',
  },
  {
    quote: 'Clear request statuses mean I always know whether a lesson has been accepted.',
    name: 'Sample parent',
    detail: 'Illustrative example',
  },
];
