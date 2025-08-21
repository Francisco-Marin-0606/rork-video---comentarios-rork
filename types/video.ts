export interface Video {
  id: string;
  url: string;
  title: string;
  description: string;
  author: string;
  duration: number;
}

export interface Comment {
  id: string;
  username: string;
  text: string;
  timestamp: string;
  avatar: string;
}