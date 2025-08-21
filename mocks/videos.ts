import { Video } from '@/types/video';

export const mockVideos: Video[] = [
  {
    id: '1',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    title: 'Big Buck Bunny',
    description: 'A short animated film',
    author: '@blender',
    duration: 596000,
  },
  {
    id: '2',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    title: 'Elephants Dream',
    description: 'Another animated short',
    author: '@blender',
    duration: 653000,
  },
  {
    id: '3',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'For Bigger Blazes',
    description: 'Action video',
    author: '@google',
    duration: 15000,
  },
];