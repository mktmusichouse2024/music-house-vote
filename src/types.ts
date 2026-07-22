export interface Teacher {
  id: string;
  name: string;
  subject: string;
  category: string;
  avatar: string;
  votesCount: number;
  bio: string;
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
