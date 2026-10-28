export type UserRole = 'student' | 'tutor' | 'admin';
export type TutorStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended';
export type TeachingMode = 'online' | 'in_person' | 'both';
export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
}

export type SubjectRef = Pick<Subject, 'id' | 'name' | 'slug'>;

export interface TutorProfile {
  id: string;
  user_id: string;
  display_name: string;
  headline: string;
  bio: string;
  qualifications: string;
  experience_years: number;
  hourly_rate: number | null;
  teaching_mode: TeachingMode;
  location: string;
  avatar_url: string | null;
  status: TutorStatus;
  admin_note: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Tutor data safe to show publicly. `isDemo` marks bundled sample profiles. */
export interface PublicTutor {
  id: string;
  display_name: string;
  headline: string;
  bio: string;
  qualifications: string;
  experience_years: number;
  hourly_rate: number | null;
  teaching_mode: TeachingMode;
  location: string;
  avatar_url: string | null;
  subjects: SubjectRef[];
  isDemo?: boolean;
}

export interface Booking {
  id: string;
  student_id: string;
  tutor_id: string;
  subject_id: string;
  requested_date: string;
  requested_time: string;
  message: string | null;
  status: BookingStatus;
  status_note: string | null;
  student_name: string;
  tutor_name: string;
  created_at: string;
  updated_at: string;
  subject?: { name: string } | null;
}
