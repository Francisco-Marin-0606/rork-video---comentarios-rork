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

  const ENTER_DURATION = 280;
  const EXIT_DURATION = 240;

  const [localVisible, setLocalVisible] = useState<boolean>(visible);
  const overlayOpacity = useRef<Animated.Value>(new Animated.Value(0)).current;
  const translateY = useRef<Animated.Value>(new Animated.Value(Math.round(screenHeight * 0.2))).current;
  const isAnimatingRef = useRef<boolean>(false);

  useEffect(() => {
    if (visible) {
      if (!localVisible) setLocalVisible(true);
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 1, duration: ENTER_DURATION, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: ENTER_DURATION, useNativeDriver: true }),
      ]).start(({ finished }) => {
        console.log('CommentsModal enter finished', finished);
      });
    } else if (localVisible && !isAnimatingRef.current) {
      isAnimatingRef.current = true;
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: EXIT_DURATION, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: Math.round(screenHeight * 0.2), duration: EXIT_DURATION, useNativeDriver: true }),
      ]).start(({ finished }) => {
        console.log('CommentsModal exit finished', finished);
        setLocalVisible(false);
        isAnimatingRef.current = false;
      });
    }
  }, [visible]);

  const handleAnimatedClose = () => {
    try {
      if (!localVisible) return;
      isAnimatingRef.current = true;
      Animated.parallel([
        Animated.timing(overlayOpacity, { toValue: 0, duration: EXIT_DURATION, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: Math.round(screenHeight * 0.2), duration: EXIT_DURATION, useNativeDriver: true }),
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
      <Animated.View style={[styles.modalOverlay, { opacity: overlayOpacity }]} testID="comments-overlay">
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={1}
          onPress={handleAnimatedClose}
          style={{ flex: 1 }}
          testID="comments-backdrop"
        />
        <KeyboardAvoidingView
          style={[styles.container, styles.sheet]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Animated.View style={{ flex: 1, transform: [{ translateY }] }} testID="comments-sheet">
            <View style={styles.header}>
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

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Añade un comentario..."
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
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: Math.round(screenHeight * 0.75),
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 999,
  },
  commentsContainer: {
    flex: 1,
    paddingHorizontal: 16,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    backgroundColor: '#000',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
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
});