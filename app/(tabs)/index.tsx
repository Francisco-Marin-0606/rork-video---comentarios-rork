import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SkipForward, MessageCircle, RotateCcw, RotateCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import CommentsModal from '@/components/CommentsModal';
import { mockComments } from '@/mocks/comments';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

import { VideoView, useVideoPlayer, ResizeMode, VideoViewProps } from 'expo-video';

const FIXED_VIDEO_URI = 'https://firebasestorage.googleapis.com/v0/b/samples-64df5.appspot.com/o/Intro%20a%20la%20hipnosis.mp4?alt=media&token=613551ee-ad60-48ee-b0cc-cf1358956fc1' as const;

export default function VideoScreen() {
  const router = useRouter();
  const [showCommentsModal, setShowCommentsModal] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hasUserInteracted, setHasUserInteracted] = useState<boolean>(false);
  const [sourceUri] = useState<string>(FIXED_VIDEO_URI);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [triedFallback] = useState<boolean>(false);
  const videoRef = useRef<VideoView | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<Record<string, unknown> | null>(null);

  const [iconVisible, setIconVisible] = useState<boolean>(false);
  const [commentsCount] = useState<number>(mockComments.length);
  const iconOpacity = useRef<Animated.Value>(new Animated.Value(0)).current;
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevIsPlaying = useRef<boolean>(false);

  const showPlayPauseIcon = useCallback(() => {
    try {
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
        fadeTimeoutRef.current = null;
      }
      setIconVisible(true);
      Animated.timing(iconOpacity, {
        toValue: 0.6,
        duration: 180,
        useNativeDriver: true,
      }).start();
      fadeTimeoutRef.current = setTimeout(() => {
        Animated.timing(iconOpacity, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) setIconVisible(false);
        });
      }, 2000);
    } catch (e) {
      console.log('showPlayPauseIcon error', e);
    }
  }, [iconOpacity]);

  useEffect(() => {
    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    console.log('Audio config skipped (expo-video)');
  }, []);

  useEffect(() => {
    if (prevIsPlaying.current !== isPlaying) {
      showPlayPauseIcon();
      prevIsPlaying.current = isPlaying;
    }
  }, [isPlaying, showPlayPauseIcon]);

  const onStatusUpdate = useCallback((s: Record<string, unknown>) => {
    try {
      setPlaybackStatus(s);
      if (s && typeof s === 'object') {
        const playing = Boolean((s as any).isPlaying ?? (s as any).playing);
        setIsPlaying(playing);
        if (loadError) setLoadError(null);
      }
    } catch (e) {
      console.log('onStatusUpdate error', e);
    }
  }, [loadError]);

  const player = useVideoPlayer(sourceUri, {
    autoPlay: Platform.OS === 'web' ? hasUserInteracted : true,
    isMuted: Platform.OS === 'web' ? !hasUserInteracted : false,
    isLooping: true,
    staysActiveInBackground: false,
    onStatusUpdate,
  });

  const handlePlayPause = async () => {
    try {
      if (!hasUserInteracted) setHasUserInteracted(true);
      if (Platform.OS !== 'web') {
        await Haptics.selectionAsync();
      }
      if (player.playing) {
        player.pause();
      } else {
        player.play();
      }
      showPlayPauseIcon();
    } catch (e) {
      console.log('handlePlayPause error', e);
    }
  };

  const handleSeek = async (deltaSeconds: number) => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const pos = player.currentTime ?? 0;
      const next = Math.max(0, pos + deltaSeconds);
      player.seek(next);
    } catch (e) {
      console.log('Seek error', e);
    }
  };

  const handleSkipVideo = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      const v = videoRef.current;
      await v?.pauseAsync?.();
      setIsPlaying(false);
    } catch {}
    router.replace('/+not-found');
  };

  const handleShowComments = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowCommentsModal(true);
  };

  const remainingLabel = React.useMemo(() => {
    try {
      const s = playbackStatus as any;
      if (s) {
        const durationMs = (s.durationMillis ?? (s.duration != null ? s.duration * 1000 : 0)) as number;
        const positionMs = (s.positionMillis ?? (s.currentTime != null ? s.currentTime * 1000 : 0)) as number;
        const remaining = Math.max(0, durationMs - positionMs);
        const totalSeconds = Math.floor(remaining / 1000);
        const m = Math.floor(totalSeconds / 60);
        const sLeft = totalSeconds % 60;
        return `${m}m ${sLeft}s`;
      }
    } catch (e) {
      console.log('remainingLabel calc error', e);
    }
    return '--';
  }, [playbackStatus]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <TouchableOpacity
        testID="video-touch-surface"
        style={styles.videoContainer}
        activeOpacity={1}
        onPress={handlePlayPause}
      >
        <VideoView
          ref={(r: VideoView | null) => { videoRef.current = r; }}
          style={styles.video}
          player={player}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
          nativeControls={false}
          contentFit={ResizeMode.COVER}
          onError={(e: unknown) => {
            const msg = JSON.stringify(e?.nativeEvent ?? e);
            console.log('Video onError', msg);
            setLoadError('No se pudo cargar el video. Verifica tu conexión e inténtalo nuevamente.');
          }}
        />

        <View style={styles.centerOverlay} pointerEvents="none">
          {iconVisible && (
            <Animated.Image
              testID={isPlaying ? 'pause-icon' : 'play-icon'}
              source={{ uri: isPlaying
                ? 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png'
                : 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png' }}
              style={[styles.playPauseIcon, { opacity: iconOpacity }]}
              resizeMode="contain"
            />
          )}
          {!hasUserInteracted && (
            <Text style={styles.tapToPlayText}>{Platform.OS === 'web' ? 'Toca para reproducir (autoplay desactivado en web)' : 'Toca para reproducir'}</Text>
          )}
          {!!loadError && (
            <Text style={styles.errorText}>{loadError}</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          testID="seek-back-15"
          style={styles.controlInline}
          onPress={() => handleSeek(-15)}
        >
          <RotateCcw color="#fff" size={18} />
          <Text style={styles.inlineText}>15s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="seek-forward-15"
          style={styles.controlInline}
          onPress={() => handleSeek(15)}
        >
          <RotateCw color="#fff" size={18} />
          <Text style={styles.inlineText}>15s</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="skip-video"
          style={styles.controlChip}
          onPress={handleSkipVideo}
        >
          <SkipForward color="#fff" size={18} />
          <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">Saltear intro · {remainingLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="open-comments"
          style={styles.controlChip}
          onPress={handleShowComments}
        >
          <MessageCircle color="#fff" size={18} />
          <Text style={styles.chipText} numberOfLines={1}>{commentsCount}</Text>
        </TouchableOpacity>
      </View>


      <CommentsModal
        visible={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: screenWidth,
    height: screenHeight,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  centerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  playPauseIcon: {
    width: 72,
    height: 72,
  },
  controlsRow: {
    position: 'absolute',
    bottom: 64,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    flexWrap: 'wrap',
  },


  controlButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 25,
    padding: 12,
    minWidth: 50,
  },
  controlInline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  controlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 1,
  },
  controlText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
    textAlign: 'center',
  },
  inlineText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '700',
  },
  chipText: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '700',
  },


  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  tapToPlayText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
});