import PropTypes from 'prop-types';
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  doc as firestoreDoc,
  where,
  query,
  orderBy,
  deleteDoc,
  collection,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import {
  Text,
  View,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  ScrollView,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';

import { colors } from '../config/constants';
import ContactRow from '../components/ContactRow';
import { auth, database } from '../config/firebase';

const NEW_MESSAGES_KEY = 'newMessages';

const Chats = ({ setUnreadCount = () => { } }) => {
  const navigation = useNavigation();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [newMessages, setNewMessages] = useState({});

  // --- Android Back Button: deselect selected items ---
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBack = () => {
      if (selectedItems.length > 0) {
        setSelectedItems([]);
        return true; // prevent default back
      }
      return false; // allow default back
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => subscription.remove();
  }, [selectedItems.length]);

  // --- Load stored newMessages from AsyncStorage and set unread count ---
  const loadStoredNewMessages = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(NEW_MESSAGES_KEY);
      const parsed = stored ? JSON.parse(stored) : {};
      setNewMessages(parsed);
      const total = Object.values(parsed).reduce((a, b) => a + b, 0);
      setUnreadCount(total);
    } catch (error) {
      console.log('Error loading new messages from AsyncStorage', error);
    }
  }, [setUnreadCount]);

  // --- Real-time listener for chats where current user exists ---
  useFocusEffect(
    useCallback(() => {
      let unsubscribe = () => { };
      const currentUserEmail = auth?.currentUser?.email;

      // call once initially
      loadStoredNewMessages();

      try {
        const chatsRef = collection(database, 'chats');

        // NOTE: Firestore may require a composite index for (where array-contains + orderBy).
        const q = query(
          chatsRef,
          where('users', 'array-contains', currentUserEmail),
          orderBy('lastUpdated', 'desc')
        );

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            // map docs to plain objects
            const chatDocs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setChats(chatDocs);
            setLoading(false);

            // handle doc changes to increase unread counts only for incoming messages
            snapshot.docChanges().forEach((change) => {
              if (change.type !== 'modified') return;

              const chatId = change.doc.id;
              const chatData = change.doc.data();

              // Get "latest" message robustly:
              const msgs = Array.isArray(chatData.messages) ? chatData.messages : [];
              if (msgs.length === 0) return;

              // determine latest message object (assume messages may be stored oldest->newest or newest->oldest)
              // try to use a timestamp on messages if available, otherwise take last array item
              let latestMsg = msgs[0];
              if (msgs.length > 1) {
                // find message with max createdAt (if present)
                let found = msgs[0];
                for (let m of msgs) {
                  const a = m?.createdAt;
                  const b = found?.createdAt;
                  // Handle Firestore Timestamp or millis number or ISO string
                  const at = a && (a.toMillis ? a.toMillis() : typeof a === 'number' ? a : Date.parse(a));
                  const bt = b && (b.toMillis ? b.toMillis() : typeof b === 'number' ? b : Date.parse(b));
                  if (!bt || (at && at > bt)) found = m;
                }
                latestMsg = found;
              }

              if (!latestMsg || !latestMsg.user) return;

              const senderId = latestMsg.user._id || latestMsg.user.id || latestMsg.user.email || '';
              const currentUid = auth?.currentUser?.uid || '';
              const currentEmail = auth?.currentUser?.email || '';

              // If message was sent by someone else, increment unread for this chat
              const isFromOther =
                senderId &&
                senderId !== currentEmail &&
                senderId !== currentUid;

              if (isFromOther) {
                setNewMessages((prev) => {
                  const updated = { ...prev, [chatId]: (prev[chatId] || 0) + 1 };
                  // persist, but don't await here (avoid blocking UI). Catch errors.
                  AsyncStorage.setItem(NEW_MESSAGES_KEY, JSON.stringify(updated)).catch((e) =>
                    console.log('Failed to persist newMessages', e)
                  );
                  setUnreadCount(Object.values(updated).reduce((a, b) => a + b, 0));
                  return updated;
                });
              }
            });
          },
          (error) => {
            console.log('Chats onSnapshot error:', error);
            setLoading(false);
          }
        );
      } catch (err) {
        console.log('Error setting up chats listener', err);
        setLoading(false);
      }

      return () => {
        try {
          unsubscribe && unsubscribe();
        } catch (e) {
          // noop
        }
      };
    }, [loadStoredNewMessages, setUnreadCount])
  );

  // --- Helpers ---
  const getChatName = useCallback((chat) => {
    if (!chat) return 'Unknown Chat';
    if (chat.groupName) return chat.groupName;

    const users = chat.users || [];
    const currentEmail = auth?.currentUser?.email;
    if (!Array.isArray(users) || users.length < 2) {
      // Sometimes users may be stored as objects ({ email, name }) or plain strings
      const other = Array.isArray(users) ? users.find((u) => u !== currentEmail) : null;
      return other?.name || other?.email || other || 'Unnamed';
    }

    // find other user (support both object and string)
    const otherUser = users.find((u) => {
      if (!u) return false;
      if (typeof u === 'string') return u !== currentEmail;
      // object
      return (u.email && u.email !== currentEmail) || (u.id && u.id !== currentEmail);
    });

    if (!otherUser) return 'Unnamed';
    return typeof otherUser === 'string' ? otherUser : otherUser.name || otherUser.email || 'Unnamed';
  }, []);

  // Robustly get last message preview
  const getSubtitle = useCallback((chat) => {
    const messages = Array.isArray(chat.messages) ? chat.messages : [];
    if (messages.length === 0) return 'No messages yet';

    // pick latest message similar to above logic
    let latest = messages[0];
    if (messages.length > 1) {
      let found = messages[0];
      for (let m of messages) {
        const a = m?.createdAt;
        const b = found?.createdAt;
        const at = a && (a.toMillis ? a.toMillis() : typeof a === 'number' ? a : Date.parse(a));
        const bt = b && (b.toMillis ? b.toMillis() : typeof b === 'number' ? b : Date.parse(b));
        if (!bt || (at && at > bt)) found = m;
      }
      latest = found;
    }

    const message = latest;
    const senderId = message.user?._id || message.user?.id || message.user?.email || '';
    const isCurrentUser =
      senderId &&
      (senderId === auth?.currentUser?.email || senderId === auth?.currentUser?.uid);

    const userName = isCurrentUser ? 'You' : message.user?.name?.split?.(' ')[0] || 'User';
    let text = message.image ? '📷 Image' : message.text || '';
    if (text.length > 25) text = `${text.slice(0, 25)}...`;
    return `${userName}: ${text}`;
  }, []);

  const getSubtitle2 = useCallback((chat) => {
    if (!chat?.lastUpdated) return '';
    let millis = null;
    const lu = chat.lastUpdated;
    if (lu && typeof lu === 'object' && typeof lu.toMillis === 'function') {
      millis = lu.toMillis();
    } else if (typeof lu === 'number') {
      millis = lu;
    } else if (typeof lu === 'string') {
      millis = Date.parse(lu);
    }
    if (!millis || Number.isNaN(millis)) return '';
    const date = new Date(millis);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }, []);

  // --- Navigation & selection handlers ---
  const handleChatPress = (chat) => {
    if (!chat) return;
    const chatId = chat.id;

    // If currently selecting items, toggle selection
    if (selectedItems.length) {
      selectItems(chat);
      return;
    }

    // mark unread count for this chat as zero locally and persist
    setNewMessages((prev) => {
      const updated = { ...prev, [chatId]: 0 };
      AsyncStorage.setItem(NEW_MESSAGES_KEY, JSON.stringify(updated)).catch((e) =>
        console.log('Failed to persist newMessages', e)
      );
      setUnreadCount(Object.values(updated).reduce((a, b) => a + b, 0));
      return updated;
    });

    navigation.navigate('Chat', { id: chatId, chatName: getChatName(chat) });
  };

  const handleChatLongPress = (chat) => {
    selectItems(chat);
  };

  const selectItems = (chat) => {
    if (!chat) return;
    setSelectedItems((prev) =>
      prev.includes(chat.id) ? prev.filter((id) => id !== chat.id) : [...prev, chat.id]
    );
  };

  const getSelected = (chat) => selectedItems.includes(chat.id);
  const deSelectItems = useCallback(() => setSelectedItems([]), []);
  const handleFabPress = () => navigation.navigate('Users');

  // --- Delete selected chats (confirm) ---
  const handleDeleteChat = useCallback(() => {
    if (selectedItems.length === 0) return;
    Alert.alert(
      selectedItems.length > 1 ? 'Delete selected chats?' : 'Delete this chat?',
      'Messages will be removed from the database (for all participants) if you delete the chat. Make sure this is intended.',
      [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const deletePromises = selectedItems.map(async (chatId) => {
                const chatRef = firestoreDoc(database, 'chats', chatId);
                await deleteDoc(chatRef);
              });
              await Promise.all(deletePromises);
              setSelectedItems([]);
            } catch (err) {
              console.log('Error deleting chats:', err);
              Alert.alert('Error', 'Could not delete chats. Try again.');
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  }, [selectedItems]);

  // --- Header buttons depending on selection ---
  useEffect(() => {
    navigation.setOptions({
      headerRight:
        selectedItems.length > 0
          ? () => (
            <TouchableOpacity style={styles.trashBin} onPress={handleDeleteChat}>
              <Ionicons name="trash" size={24} color={colors.teal} />
            </TouchableOpacity>
          )
          : undefined,
      headerLeft:
        selectedItems.length > 0
          ? () => <Text style={styles.itemCount}>{selectedItems.length}</Text>
          : undefined,
    });
  }, [selectedItems.length, navigation, handleDeleteChat]);

  // --- Render ---
  return (
    <Pressable style={styles.container} onPress={deSelectItems}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.teal} />
        </View>
      ) : (
        <ScrollView>
          {chats.length === 0 ? (
            <View style={styles.blankContainer}>
              <Text style={styles.textContainer}>No conversations yet</Text>
            </View>
          ) : (
            chats.map((chat) => (
              <ContactRow
                key={chat.id}
                style={getSelected(chat) ? styles.selectedContactRow : undefined}
                name={getChatName(chat)}
                subtitle={getSubtitle(chat)}
                subtitle2={getSubtitle2(chat)}
                onPress={() => handleChatPress(chat)}
                onLongPress={() => handleChatLongPress(chat)}
                selected={getSelected(chat)}
                showForwardIcon={false}
                newMessageCount={newMessages[chat.id] || 0}
              />
            ))
          )}
          <View style={styles.blankContainer}>
            <Text style={{ fontSize: 12, margin: 15 }}>
              <Ionicons name="lock-open" size={12} style={{ color: '#565656' }} /> Your messages are{' '}
              <Text style={{ color: colors.teal }}>not end-to-end encrypted</Text>
            </Text>
          </View>
        </ScrollView>
      )}
      <TouchableOpacity style={styles.fab} onPress={handleFabPress} accessibilityLabel="New chat">
        <View style={styles.fabContainer}>
          <Ionicons name="chatbox-ellipses" size={24} color="white" />
        </View>
      </TouchableOpacity>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  blankContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  container: {
    flex: 1,
  },
  fab: {
    bottom: 12,
    position: 'absolute',
    right: 12,
  },
  fabContainer: {
    alignItems: 'center',
    backgroundColor: colors.teal,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    width: 56,
    elevation: 4,
  },
  itemCount: {
    color: colors.teal,
    fontSize: 18,
    fontWeight: '400',
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  selectedContactRow: {
    backgroundColor: '#e0f7f7',
  },
  textContainer: {
    fontSize: 16,
  },
  trashBin: {
    marginRight: 12,
  },
});

Chats.propTypes = {
  setUnreadCount: PropTypes.func,
};

export default Chats;
