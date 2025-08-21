import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { X, Send } from 'lucide-react-native';
import { Comment } from '@/types/video';
import { mockComments } from '@/mocks/comments';

interface CommentsModalProps {
  visible: boolean;
  onClose: () => void;
}

const { height: screenHeight } = Dimensions.get('window');

export default function CommentsModal({ visible, onClose }: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [newComment, setNewComment] = useState<string>('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);

  const ENTER_DURATION = 280;
  const EXIT_DURATION = 240;

  const [localVisible, setLocalVisible] = useState<boolean>(visible);
  const progress = useRef<Animated.Value>(new Animated.Value(0)).current;
  const isAnimatingRef = useRef<boolean>(false);

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
        isAnimatingRef.current = false;
      });
    }
  }, [visible, localVisible, progress]);

  const handleAnimatedClose = () => {
    try {
      if (!localVisible) return;
      isAnimatingRef.current = true;
      Animated.timing(progress, { toValue: 0, duration: EXIT_DURATION, useNativeDriver: true }).start(({ finished }) => {
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
    const showSub = Keyboard.addListener('keyboardDidShow', (e: unknown) => {
      setIsKeyboardVisible(true);
      const evt = e as { endCoordinates?: { height?: number } } | undefined;
      const h = evt?.endCoordinates?.height ?? 0;
      setKeyboardHeight(typeof h === 'number' ? h : 0);
      console.log('keyboardDidShow', h);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
      console.log('keyboardDidHide');
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const EMOJIS = useMemo<string[]>(() => ['😂','😭','🔥','💀','😅','🤫','😮','😆'], []);
  const handleAddEmoji = (emoji: string) => {
    setNewComment((prev) => `${prev}${prev ? ' ' : ''}${emoji}`);
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        username: 'tu_usuario',
        text: newComment.trim(),
        timestamp: 'ahora',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
      };
      setComments([comment, ...comments]);
      setNewComment('');
    }
  };

  return (
    <Modal
      visible={localVisible}
      transparent
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
            height: Math.round(screenHeight * 0.75),
            borderTopLeftRadius: 18,
            borderTopRightRadius: 18,
            overflow: 'hidden',
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [Math.round(screenHeight * 0.2), 0],
                }),
              },
            ],
          }}
          testID="comments-sheet"
        >
          <KeyboardAvoidingView
            style={styles.kbContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <View style={styles.header}>
              <View style={styles.grabberContainer}>
                <View style={styles.grabber} />
              </View>
              <Text style={styles.headerTitle}>Comentarios</Text>
              <TouchableOpacity onPress={handleAnimatedClose} style={styles.closeButton} testID="comments-close">
                <X color="#fff" size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.commentsContainer}
              showsVerticalScrollIndicator={false}
              testID="comments-list"
            >
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <Image source={{ uri: comment.avatar }} style={styles.avatar} />
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

            <View style={styles.emojiBar} testID="comments-emoji-bar">
              {EMOJIS.map((e) => (
                <TouchableOpacity key={e} onPress={() => handleAddEmoji(e)} style={styles.emojiBtn}>
                  <Text style={styles.emojiText}>{e}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[styles.inputContainer, isKeyboardVisible ? { paddingBottom: Math.max(12, keyboardHeight > 0 ? 12 : 12) } : null]}>
              <TextInput
                style={styles.textInput}
                placeholder="¿Qué opinas sobre esto?"
                placeholderTextColor="#666"
                value={newComment}
                onChangeText={setNewComment}
                multiline
                maxLength={500}
                testID="comments-input"
              />
              <TouchableOpacity
                onPress={handleAddComment}
                style={[styles.sendButton, { opacity: newComment.trim() ? 1 : 0.5 }]}
                disabled={!newComment.trim()}
                testID="comments-send"
              >
                <Send color="#0095f6" size={20} />
              </TouchableOpacity>
            </View>
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
    backgroundColor: 'transparent',
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
    backgroundColor: '#131313',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 999,
  },
  commentsContainer: {
    flex: 1,
    paddingHorizontal: 16,
    backgroundColor: '#0f0f0f',
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
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
  emojiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#1f1f1f',
    backgroundColor: '#0f0f0f',
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
    backgroundColor: '#0f0f0f',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 999,
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
});