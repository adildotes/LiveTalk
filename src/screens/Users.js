import React, { useState, useEffect, useCallback, Fragment } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  doc,
  query,
  where,
  setDoc,
  orderBy,
  collection,
  onSnapshot
} from "firebase/firestore";

import Cell from "../components/Cell";
import ContactRow from "../components/ContactRow";
import { colors } from "../config/constants";
import { auth, database } from "../config/firebase";

const Users = () => {
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [existingChats, setExistingChats] = useState([]);

  // 🧩 Fetch all users and current user's chats
  useEffect(() => {
    if (!auth?.currentUser?.email) return;

    const collectionUserRef = collection(database, "users");
    const usersQuery = query(collectionUserRef, orderBy("name", "asc"));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs);
    });

    const collectionChatsRef = collection(database, "chats");
    // Query chats where groupName is empty, then filter client-side for current user's email.
    const chatsQuery = query(collectionChatsRef, where("groupName", "==", ""));
    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
      const existing = snapshot.docs
        .map((chat) => ({ chatId: chat.id, userEmails: chat.data().users }))
        .filter((c) => Array.isArray(c.userEmails) && c.userEmails.some((u) => (u && u.email) ? u.email === auth.currentUser.email : u === auth.currentUser.email));
      setExistingChats(existing);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeChats();
    };
  }, []);

  // 🧩 Get display name
  const handleName = useCallback((user) => {
    const { name, email } = user.data();
    if (!email) return "~ No Name or Email ~";
    if (email === auth?.currentUser?.email) return `${name || email} (You)`;
    return name || email;
  }, []);

  // 🧩 Subtitle under each user
  const handleSubtitle = useCallback(
    (user) =>
      user.data().email === auth?.currentUser?.email
        ? "Message yourself"
        : "User status",
    []
  );

  // 🧩 Navigate or create chat
  const handleNavigate = useCallback(
    async (user) => {
      if (!auth?.currentUser?.email) {
        Alert.alert("Error", "You must be logged in to start a chat");
        return;
      }

      let navigationChatID = "";
      let messageYourselfChatID = "";

      existingChats.forEach((existingChat) => {
        const isCurrentUserInChat = existingChat.userEmails.some(
          (e) => e.email === auth.currentUser.email
        );
        const isUserInChat = existingChat.userEmails.some(
          (e) => e.email === user.data().email
        );

        if (isCurrentUserInChat && isUserInChat) {
          navigationChatID = existingChat.chatId;
        }

        const sameUserCount = existingChat.userEmails.filter(
          (e) => e.email === user.data().email
        ).length;

        if (sameUserCount === 2) {
          messageYourselfChatID = existingChat.chatId;
        }
      });

      // Navigate logic
      if (messageYourselfChatID || navigationChatID) {
        navigation.navigate("Chat", {
          id: messageYourselfChatID || navigationChatID,
          chatName: handleName(user),
        });
      } else {
        // Create new chat
        const newRef = doc(collection(database, "chats"));
        await setDoc(newRef, {
          lastUpdated: Date.now(),
          groupName: "",
          users: [
            {
              email: auth.currentUser.email,
              name: auth.currentUser.displayName || "",
              deletedFromChat: false,
            },
            {
              email: user.data().email,
              name: user.data().name || "",
              deletedFromChat: false,
            },
          ],
          lastAccess: [
            { email: auth.currentUser.email, date: Date.now() },
            { email: user.data().email, date: "" },
          ],
          messages: [],
        });

        navigation.navigate("Chat", {
          id: newRef.id,
          chatName: handleName(user),
        });
      }
    },
    [existingChats, handleName, navigation]
  );

  // 🧩 Navigation shortcuts
  const handleNewGroup = () => navigation.navigate("Group");
  // New user modal state
  const [newUserModalVisible, setNewUserModalVisible] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleNewUser = () => setNewUserModalVisible(true);

  const closeNewUserModal = () => {
    setNewUserModalVisible(false);
    setNewUserEmail("");
    setLookupLoading(false);
  };

  // Lookup user by email from users collection and navigate/create chat
  const submitNewUserEmail = async () => {
    const email = (newUserEmail || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }

    try {
      setLookupLoading(true);
      const usersRef = collection(database, "users");
      const q = query(usersRef, where("email", "==", email));
      const snap = await new Promise((resolve, reject) => {
        const unsub = onSnapshot(
          q,
          (s) => {
            unsub();
            resolve(s);
          },
          (err) => {
            unsub();
            reject(err);
          }
        );
      });

      if (!snap || snap.empty) {
        Alert.alert("User not found", "No registered user found with this email.");
        setLookupLoading(false);
        return;
      }

      const userDoc = snap.docs[0];
      // reuse handleNavigate logic but we need a wrapper to accept a doc-like object
      await handleNavigate(userDoc);
      closeNewUserModal();
    } catch (err) {
      console.log("Lookup error", err);
      Alert.alert("Error", "Could not look up user. Try again.");
      setLookupLoading(false);
    }
  };

  // 🧩 Render
  return (
    <SafeAreaView style={styles.container}>
      <Cell
        title="New group"
        icon="people"
        tintColor={colors.teal}
        onPress={handleNewGroup}
        style={{ marginTop: 5 }}
      />
      <Cell
        title="New user"
        icon="person-add"
        tintColor={colors.teal}
        onPress={handleNewUser}
        style={{ marginBottom: 10 }}
      />

      <Modal visible={newUserModalVisible} animationType="slide" transparent>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: 'white', borderRadius: 8, padding: 16, elevation: 5 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>Add user by email</Text>
            <TextInput
              placeholder="user@example.com"
              value={newUserEmail}
              onChangeText={setNewUserEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 6, marginBottom: 12 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={closeNewUserModal} style={{ padding: 8, marginRight: 8 }}>
                <Text style={{ color: '#777' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={submitNewUserEmail} style={{ padding: 8 }} accessibilityRole="button">
                {lookupLoading ? (
                  <ActivityIndicator />
                ) : (
                  <Text style={{ color: colors.teal, fontWeight: '600' }}>Add</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {users.length === 0 ? (
        <View style={styles.blankContainer}>
          <Text style={styles.textContainer}>No registered users yet</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Registered users</Text>
          {users.map((user) => (
            <Fragment key={user.id}>
              <ContactRow
                name={handleName(user)}
                subtitle={handleSubtitle(user)}
                onPress={() => handleNavigate(user)}
                showForwardIcon={false}
                avatar={user.data()?.photoURL}
              />
            </Fragment>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// 🧩 Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  blankContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginVertical: 8,
    marginLeft: 16,
  },
  textContainer: {
    fontSize: 15,
    fontWeight: "300",
    marginLeft: 16,
    marginVertical: 10,
  },
});

export default Users;
