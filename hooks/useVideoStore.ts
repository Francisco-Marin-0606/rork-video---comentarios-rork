import { create } from 'zustand';
import { Video } from '@/types/video';
import { mockVideos } from '@/mocks/videos';

interface VideoStore {
  videos: Video[];
  currentVideoIndex: number;
  currentVideo: Video | null;
  nextVideo: () => void;
  previousVideo: () => void;
  setCurrentVideoIndex: (index: number) => void;
}

export const useVideoStore = create<VideoStore>((set, get) => ({
  videos: mockVideos,
  currentVideoIndex: 0,
  currentVideo: mockVideos[0] || null,
  
  nextVideo: () => {
    const { videos, currentVideoIndex } = get();
    const nextIndex = (currentVideoIndex + 1) % videos.length;
    set({
      currentVideoIndex: nextIndex,
      currentVideo: videos[nextIndex],
    });
  },
  
  previousVideo: () => {
    const { videos, currentVideoIndex } = get();
    const prevIndex = currentVideoIndex === 0 ? videos.length - 1 : currentVideoIndex - 1;
    set({
      currentVideoIndex: prevIndex,
      currentVideo: videos[prevIndex],
    });
  },
  
  setCurrentVideoIndex: (index: number) => {
    const { videos } = get();
    if (index >= 0 && index < videos.length) {
      set({
        currentVideoIndex: index,
        currentVideo: videos[index],
      });
    }
  },
}));