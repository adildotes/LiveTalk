import React, { useState, useEffect, useCallback, Fragment } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert
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
    const chatsQuery = query(
      collectionChatsRef,
      where("users", "array-contains", {
        email: auth.currentUser.email,
        name: auth.currentUser.displayName || "",
        deletedFromChat: false,
      }),
      where("groupName", "==", "")
    );
    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
      const existing = snapshot.docs.map((chat) => ({
        chatId: chat.id,
        userEmails: chat.data().users,
      }));
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
  const handleNewUser = () => Alert.alert("Feature Coming Soon", "Invite users");

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
