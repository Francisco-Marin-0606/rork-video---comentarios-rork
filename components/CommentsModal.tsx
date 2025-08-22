import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowUp, X } from 'lucide-react-native';
import { Comment } from '@/types/video';
import { mockComments } from '@/mocks/comments';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
  onKeyboardChange?: (visible: boolean) => void;
}

const { height: screenHeight } = Dimensions.get('window');

export default function CommentsModal({ visible, onClose, onCountChange, onKeyboardChange }: CommentsModalProps) {
  const insets = useSafeAreaInsets();
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState<string>('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const keyboardOffset = useRef<Animated.Value>(new Animated.Value(0)).current;
  const lastKbHeightRef = useRef<number>(0);

  const ENTER_DURATION = 280;
  const EXIT_DURATION = 240;

  const [localVisible, setLocalVisible] = useState<boolean>(visible);
  const progress = useRef<Animated.Value>(new Animated.Value(0)).current;
  const isAnimatingRef = useRef<boolean>(false);
  const gestureStartTSRef = useRef<number>(0);

  useEffect(() => {
    if (visible) {
      if (!localVisible) setLocalVisible(true);
      Animated.timing(progress, { toValue: 1, duration: ENTER_DURATION, useNativeDriver: true }).start(({ finished }) => {
        console.log('CommentsModal enter finished', finished);
      });
    } else if (localVisible && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      Animated.timing(progress, { toValue: 0, duration: EXIT_DURATION, useNativeDriver: true }).start(({ finished }) => {
        console.log('CommentsModal exit finished', finished);
        setLocalVisible(false);
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
        keyboardOffset.setValue(0);
        isAnimatingRef.current = false;
      });
    }
  }, [visible, localVisible, progress, keyboardOffset]);

  const handleAnimatedClose = () => {
    try {
      if (!localVisible) return;
      Keyboard.dismiss();
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      keyboardOffset.setValue(0);
      isAnimatingRef.current = true;
      Animated.parallel([
        Animated.timing(progress, { toValue: 0, duration: EXIT_DURATION, useNativeDriver: true }),
        // no drag animation when closing
      ]).start(({ finished }) => {
        console.log('CommentsModal manual exit finished', finished);
        setLocalVisible(false);
        isAnimatingRef.current = false;
        onClose();
      });
    } catch (e) {
      console.log('CommentsModal handleAnimatedClose error', e);
      setLocalVisible(false);
      onClose();
    }
  };

  useEffect(() => {
    const isIOS = Platform.OS === 'ios';

    if (isIOS) {
      const changeSub = Keyboard.addListener('keyboardWillChangeFrame', (e: unknown) => {
        const evt = e as { endCoordinates?: { screenY?: number } ; duration?: number } | undefined;
        const screenY = typeof evt?.endCoordinates?.screenY === 'number' ? (evt?.endCoordinates?.screenY as number) : screenHeight;
        const nextHeight = Math.max(0, screenHeight - screenY);
        const duration = typeof evt?.duration === 'number' ? (evt!.duration! as number) : 250;
        const becameVisible = nextHeight > 0;
        if (lastKbHeightRef.current === nextHeight) return;
        lastKbHeightRef.current = nextHeight;
        setIsKeyboardVisible(becameVisible);
        try { onKeyboardChange?.(becameVisible); } catch (err) { console.log('onKeyboardChange changeFrame error', err); }
        setKeyboardHeight(nextHeight);
        Animated.timing(keyboardOffset, { toValue: nextHeight, duration, useNativeDriver: true }).start();
        console.log('keyboardWillChangeFrame', nextHeight, duration);
      });
      return () => {
        changeSub.remove();
      };
    }

    const showSub = Keyboard.addListener('keyboardDidShow', (e: unknown) => {
      setIsKeyboardVisible(true);
      try { onKeyboardChange?.(true); } catch (err) { console.log('onKeyboardChange show error', err); }
      const evt = e as { endCoordinates?: { height?: number } } | undefined;
      const heightNum = typeof evt?.endCoordinates?.height === 'number' ? (evt?.endCoordinates?.height as number) : 0;
      lastKbHeightRef.current = heightNum;
      setKeyboardHeight(heightNum);
      Animated.timing(keyboardOffset, { toValue: heightNum, duration: 0, useNativeDriver: true }).start();
      console.log('keyboardDidShow', heightNum);
    });

    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      try { onKeyboardChange?.(false); } catch (err) { console.log('onKeyboardChange hide error', err); }
      lastKbHeightRef.current = 0;
      setKeyboardHeight(0);
      Animated.timing(keyboardOffset, { toValue: 0, duration: 0, useNativeDriver: true }).start();
      console.log('keyboardDidHide');
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardOffset, onKeyboardChange]);

  useEffect(() => {
    try {
      onCountChange?.(comments.length);
    } catch (e) {
      console.log('onCountChange error', e);
    }
  }, [comments.length, onCountChange]);

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        username: 'tu_usuario',
        text: newComment.trim(),
        timestamp: 'ahora',
        avatar: '',
      };
      setComments([comment, ...comments]);
      setNewComment('');
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isKeyboardVisible,
      onStartShouldSetPanResponderCapture: () => !isKeyboardVisible,
      onMoveShouldSetPanResponder: (_e: GestureResponderEvent, g: PanResponderGestureState) =>
        !isKeyboardVisible && g.dy > 0 && Math.abs(g.dx) < 24,
      onMoveShouldSetPanResponderCapture: (_e: GestureResponderEvent, g: PanResponderGestureState) =>
        !isKeyboardVisible && g.dy > 0 && Math.abs(g.dx) < 24,
      onPanResponderGrant: () => {
        gestureStartTSRef.current = Date.now();
      },
      onPanResponderMove: () => {
        // no visual drag; detect flick only
      },
      onPanResponderRelease: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        const durationMs = Date.now() - (gestureStartTSRef.current || Date.now());
        const fastShort = g.vy >= 1.35 && durationMs <= 200;
        const longPull = g.dy >= 60;
        const shouldClose = fastShort || longPull;
        console.log('release', { dy: g.dy, vy: g.vy, durationMs, shouldClose });
        if (shouldClose) {
          handleAnimatedClose();
        }
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderTerminate: () => {},
      onShouldBlockNativeResponder: () => true,
    })
  ).current;

  const sheetHeight = Math.round(screenHeight * (isKeyboardVisible ? 0.9 : 0.75));
  const offscreenTranslate = sheetHeight + (insets?.bottom ?? 0);

  return (
    <Modal
      visible={localVisible}
      transparent
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={handleAnimatedClose}
>
      <View style={styles.modalOverlay} testID="comments-overlay">
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={1}
          onPress={handleAnimatedClose}
          style={{ flex: 1 }}
          testID="comments-backdrop"
        />
        <Animated.View
          style={{
            height: sheetHeight,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            overflow: 'hidden',
            backgroundColor: '#1a1a1a',
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [offscreenTranslate, 0],
                }),
              },
              // no drag follow; close only on quick swipe
            ],
          }}
          testID="comments-sheet"
        >
          <KeyboardAvoidingView
            style={styles.kbContainer}
            behavior={undefined}
            keyboardVerticalOffset={0}
          >
            <View
              style={styles.header}
              {...panResponder.panHandlers}
              hitSlop={{ top: 12, bottom: 12, left: 0, right: 0 }}
              testID="comments-header"
            >
              <View style={styles.grabberContainer}>
                <View style={styles.grabber} />
              </View>
              <View style={styles.headerSide} />
              <Text style={styles.headerTitle}>Comentarios</Text>
              <TouchableOpacity
                onPress={handleAnimatedClose}
                accessibilityRole="button"
                accessibilityLabel="Cerrar comentarios"
                style={styles.closeButton}
                testID="comments-close"
              >
                <X color="#ffffff" size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.commentsContainer}
              contentContainerStyle={{ paddingBottom: 96 + keyboardHeight + (insets?.bottom ?? 0) }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              testID="comments-list"
            >
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <Text style={styles.username}>{comment.username}</Text>
                      <Text style={styles.timestamp}>{comment.timestamp}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.text}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>

            {/* Background filler to avoid grey gap when keyboard is open */}
            <View
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: keyboardHeight + (isKeyboardVisible ? 0 : (insets?.bottom ?? 0)),
                backgroundColor: '#1a1a1a',
              }}
              pointerEvents="none"
              testID="comments-kb-filler"
            />
            <Animated.View
              style={[
                styles.bottomBarContainer,
                {
                  bottom: keyboardHeight,
                  paddingBottom: (isKeyboardVisible ? 12 : 12 + (insets?.bottom ?? 0)),
                },
              ]}
              testID="comments-bottom-bar"
            >
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Escribe un comentario…"
                  placeholderTextColor="#9aa0a6"
                  selectionColor="#5b7cfa"
                  value={newComment}
                  onChangeText={setNewComment}
                  multiline
                  maxLength={250}
                  testID="comments-input"
                />
                <TouchableOpacity
                  onPress={handleAddComment}
                  style={[styles.sendButton, { opacity: newComment.trim() ? 1 : 0.6 }]}
                  disabled={!newComment.trim()}
                  testID="comments-send"
                >
                  <ArrowUp color="#ffffff" size={20} />
                </TouchableOpacity>
              </View>
            </Animated.View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: Math.round(screenHeight * 0.75),
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    overflow: 'hidden',
  },
  kbContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
    backgroundColor: '#1a1a1a',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginTop: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  commentsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#1a1a1a',
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'flex-start',
  },

  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  timestamp: {
    color: '#666',
    fontSize: 12,
  },
  commentText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 18,
  },
  bottomBarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1a1a1a',
    paddingBottom: 0,
    zIndex: 3,
    elevation: 3,
  },
  emojiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
    backgroundColor: '#1a1a1a',
  },
  emojiBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  emojiText: {
    fontSize: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
    backgroundColor: '#1a1a1a',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#222427',
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#2f3236',
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7A00',
    borderRadius: 20,
  },
  grabberContainer: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#2a2a2a',
  },
  headerSide: {
    width: 36,
    height: 36,
  }
});