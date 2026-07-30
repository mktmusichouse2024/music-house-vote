export interface Teacher {
  id: string;
  name: string;
  subject: string;
  category: string;
  avatar: string;
  votesCount: number;
  viewsCount?: number;
  bio?: string;
  youtubeUrl?: string;
}

export interface VoteLog {
  id: string;
  userEmail: string;
  userName: string;
  teacherId: string;
  teacherName: string;
  ip: string;
  timestamp: string;
}

export interface User {
  email: string;
  name: string;
  picture: string;
}

export interface AppConfig {
  votingEnabled: boolean;
  countdownEnd?: string | null;
  logoUrl: string;
  programName: string;
  programSubtitle: string;
  programDescription: string;
  maxVotesPerCategory: number;
  maxVotesPerDevice: number;
  pageTitle: string;
  hideResults: boolean;
  candidateTerm?: string;
  subjectTerm?: string;
  bgMusicUrl?: string;
  voteSoundUrl?: string;
}
