import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
  Platform,
  Image,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SkipForward, MessageCircle, RotateCcw, RotateCw } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import CommentsModal from '@/components/CommentsModal';
import { mockComments } from '@/mocks/comments';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

import { Video, AVPlaybackStatus, ResizeMode, Audio } from 'expo-av';

const VIDEO_SOURCE = {
  uri: 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Videos%20Intro/Intro%20a%20la%20hipnosis.mp4',
} as const;

export default function VideoScreen() {
  const router = useRouter();
  const [showCommentsModal, setShowCommentsModal] = useState<boolean>(false);
  const [topAreaHeight, setTopAreaHeight] = useState<number>(screenHeight);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const videoRef = useRef<Video | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<AVPlaybackStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [spinnerVisible, setSpinnerVisible] = useState<boolean>(false);
  const hasNavigatedRef = useRef<boolean>(false);

  const [iconVisible, setIconVisible] = useState<boolean>(false);
  const [commentsCount, setCommentsCount] = useState<number>(mockComments.length);
  const iconOpacity = useRef<Animated.Value>(new Animated.Value(0)).current;
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinnerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (spinnerTimeoutRef.current) clearTimeout(spinnerTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        console.log('Audio mode configured: plays in silent mode on iOS');
      } catch (e) {
        console.log('Error configuring audio mode', e);
      }
    };

    configureAudio();
  }, []);

  useEffect(() => {
    if (prevIsPlaying.current !== isPlaying) {
      showPlayPauseIcon();
      prevIsPlaying.current = isPlaying;
    }
  }, [isPlaying, showPlayPauseIcon]);

  const goToNextScreen = useCallback(async () => {
    try {
      if (hasNavigatedRef.current) return;
      hasNavigatedRef.current = true;
      const v = videoRef.current;
      try { await v?.pauseAsync?.(); } catch {}
      router.replace('/+not-found');
    } catch (e) {
      console.log('goToNextScreen error', e);
    }
  }, [router]);

  const onStatusUpdate = useCallback((s: AVPlaybackStatus) => {
    setPlaybackStatus(s);
    if ('isLoaded' in s && s.isLoaded) {
      setIsPlaying(s.isPlaying ?? false);
      setIsLoading(false);
      setIsBuffering(s.isBuffering ?? false);
      if (s.didJustFinish) {
        console.log('Video finished, navigating to next screen');
        goToNextScreen();
      }
    }
  }, [goToNextScreen]);

  const handlePlayPause = async () => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.selectionAsync();
      }
      const v = videoRef.current;
      if (!v) return;
      const status = await v.getStatusAsync();
      if ('isLoaded' in status && status.isLoaded) {
        if (status.isPlaying) {
          await v.pauseAsync();
        } else {
          await v.playAsync();
        }
        showPlayPauseIcon();
      }
    } catch (e) {
      console.log('handlePlayPause error', e);
    }
  };

  const handleSeek = async (deltaSeconds: number) => {
    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      const v = videoRef.current;
      if (!v) return;
      const status = await v.getStatusAsync();
      if ('isLoaded' in status && status.isLoaded) {
        const duration = status.durationMillis ?? 0;
        const current = status.positionMillis ?? 0;
        const next = Math.max(0, Math.min(duration, current + deltaSeconds * 1000));
        await v.setPositionAsync(next);
      }
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
      const s = playbackStatus;
      if (s && 'isLoaded' in s && s.isLoaded) {
        const duration = s.durationMillis ?? 0;
        const position = s.positionMillis ?? 0;
        const remaining = Math.max(0, duration - position);
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

  useEffect(() => {
    if (spinnerTimeoutRef.current) {
      clearTimeout(spinnerTimeoutRef.current);
      spinnerTimeoutRef.current = null;
    }
    if (isLoading || isBuffering) {
      spinnerTimeoutRef.current = setTimeout(() => {
        setSpinnerVisible(true);
      }, 250);
    } else {
      setSpinnerVisible(false);
    }
  }, [isLoading, isBuffering]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <TouchableOpacity
        testID="video-touch-surface"
        style={[
          styles.videoContainer,
          showCommentsModal ? { justifyContent: 'flex-start', alignItems: 'center' } : null,
        ]}
        activeOpacity={1}
        onPress={handlePlayPause}
      >
        <Video
          ref={(r) => { videoRef.current = r; }}
          style={[
            styles.video,
            {
              height: showCommentsModal
                ? Math.max(0, Math.min(Math.round(screenHeight * 0.8), topAreaHeight))
                : screenHeight,
            },
          ]}
          source={VIDEO_SOURCE}
          resizeMode={showCommentsModal ? ResizeMode.CONTAIN : ResizeMode.COVER}
          shouldPlay
          isMuted={Platform.OS === 'web'}
          isLooping={false}
          useNativeControls={false}
          progressUpdateIntervalMillis={250}
          onLoadStart={() => { setIsLoading(true); console.log('Video load start'); }}
          onLoad={() => { setIsLoading(false); hasNavigatedRef.current = false; console.log('Video loaded'); }}
          onPlaybackStatusUpdate={onStatusUpdate}
        />

        <View style={styles.centerOverlay} pointerEvents="none">
          {spinnerVisible && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator testID="video-loading" color="#fff" size="large" />
            </View>
          )}
          {iconVisible && !spinnerVisible && (
            <Animated.Image
              testID={isPlaying ? 'pause-icon' : 'play-icon'}
              source={{ uri: isPlaying
                ? 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/PausaV3.png'
                : 'https://mental-app-images.nyc3.cdn.digitaloceanspaces.com/Mental%20%7C%20Aura_v2/Play.png' }}
              style={[styles.playPauseIcon, { opacity: iconOpacity }]}
              resizeMode="contain"
            />
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
          <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">Saltar · {remainingLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="open-comments"
          style={styles.controlChip}
          onPress={handleShowComments}
        >
          <MessageCircle color="#fff" size={18} />
          <Text style={styles.chipText} numberOfLines={1} ellipsizeMode="tail">{commentsCount > 140 ? '140+' : commentsCount}</Text>
        </TouchableOpacity>
      </View>


      <CommentsModal
        visible={showCommentsModal}
        onTopAreaHeightChange={(h: number) => {
          setTopAreaHeight(Math.max(0, Math.floor(h)));
        }}
        onClose={async () => {
          try {
            setShowCommentsModal(false);
            const v = videoRef.current;
            if (!v) return;
            const status = await v.getStatusAsync();
            if ('isLoaded' in status && status.isLoaded) {
              await v.playAsync();
              console.log('Video resumed on comments modal close');
            }
          } catch (e) {
            console.log('onClose resume video error', e);
          }
        }}
        onCountChange={(n: number) => {
          console.log('Comments count changed', n);
          setCommentsCount(n);
        }}
        onKeyboardChange={async (vis: boolean) => {
          try {
            const v = videoRef.current;
            if (!v) return;
            const status = await v.getStatusAsync();
            if ('isLoaded' in status && status.isLoaded) {
              if (vis) {
                await v.pauseAsync();
                console.log('Video paused on keyboard open');
              } else {
                await v.playAsync();
                console.log('Video resumed on keyboard close');
              }
            }
          } catch (e) {
            console.log('onKeyboardChange video pause/resume error', e);
          }
        }}
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
    width: '100%',
    backgroundColor: '#000',
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseIcon: {
    width: 50,
    height: 50,
  },
  controlsRow: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 0,
    paddingHorizontal: 12,
    flexWrap: 'nowrap',
    width: '100%',
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
    flexShrink: 0,
  },
  controlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    flexShrink: 0,
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
    flexShrink: 1,
  },


  errorText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
});