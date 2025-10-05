import PropTypes from "prop-types";
import uuid from "react-native-uuid";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import EmojiModal from "react-native-emoji-modal";
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Keyboard,
  StyleSheet,
  BackHandler,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { doc, setDoc, getDoc, onSnapshot } from "firebase/firestore";
import {
  Send,
  Bubble,
  GiftedChat,
  InputToolbar,
} from "react-native-gifted-chat";
import {
  ref,
  getStorage,
  getDownloadURL,
  uploadBytesResumable,
} from "firebase/storage";

import { colors } from "../config/constants";
import { auth, database } from "../config/firebase";

// ✅ Loading overlay
const RenderLoadingUpload = () => (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator size="large" color={colors.teal} />
  </View>
);

// ✅ Bubble styling
const RenderBubble = (props) => (
  <Bubble
    {...props}
    wrapperStyle={{
      right: {
        backgroundColor: colors.primary,
        borderRadius: 20,
        padding: 4,
        marginVertical: 2,
        marginRight: 4,
      },
      left: {
        backgroundColor: "#f1f1f1",
        borderRadius: 20,
        padding: 4,
        marginVertical: 2,
        marginLeft: 4,
      },
    }}
    textStyle={{
      right: { color: "#fff", fontSize: 15 },
      left: { color: "#333", fontSize: 15 },
    }}
  />
);

// ✅ Emoji button
const RenderEmojiButton = (handleEmojiPanel) => (
  <TouchableOpacity style={styles.iconBtn} onPress={handleEmojiPanel}>
    <Ionicons name="happy-outline" size={26} color={colors.teal} />
  </TouchableOpacity>
);

// ✅ Image button
const RenderAttachButton = (onPick) => (
  <TouchableOpacity style={styles.iconBtn} onPress={onPick}>
    <Ionicons name="attach-outline" size={26} color={colors.teal} />
  </TouchableOpacity>
);

// ✅ Custom Input Toolbar
const RenderInputToolbar = (props, handleEmojiPanel, pickImage) => (
  <View style={styles.inputWrapper}>
    {RenderEmojiButton(handleEmojiPanel)}
    {RenderAttachButton(pickImage)}
    <InputToolbar
      {...props}
      containerStyle={styles.inputToolbar}
      primaryStyle={{ alignItems: "center" }}
    />
    <Send {...props} alwaysShowSend>
      <View style={styles.sendBtn}>
        <Ionicons name="send" size={20} color={colors.teal} />
      </View>
    </Send>
  </View>
);

function Chat({ route }) {
  const [messages, setMessages] = useState([]);
  const [modal, setModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // ✅ Realtime listener
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(database, "chats", route.params.id),
      (document) => {
        if (document.exists()) {
          setMessages(
            document.data().messages.map((message) => ({
              ...message,
              createdAt: message.createdAt.toDate(),
              image: message.image ?? "",
            }))
          );
        }
      }
    );

    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      Keyboard.dismiss();
      if (modal) {
        setModal(false);
        return true;
      }
      return false;
    });

    const keyboardDidShowListener = Keyboard.addListener("keyboardDidShow", () => {
      if (modal) setModal(false);
    });

    return () => {
      unsubscribe();
      backHandler.remove();
      keyboardDidShowListener.remove();
    };
  }, [route.params.id, modal]);

  // ✅ Send messages
  const onSend = useCallback(
    async (m = []) => {
      const chatDocRef = doc(database, "chats", route.params.id);
      const chatDocSnap = await getDoc(chatDocRef);

      const chatData = chatDocSnap.data();
      const data =
        chatData?.messages?.map((message) => ({
          ...message,
          createdAt: message.createdAt.toDate(),
          image: message.image ?? "",
        })) || [];

      const messagesWillSend = [{ ...m[0], sent: true, received: false }];
      const chatMessages = GiftedChat.append(data, messagesWillSend);

      await setDoc(
        chatDocRef,
        {
          messages: chatMessages,
          lastUpdated: Date.now(),
        },
        { merge: true }
      );
    },
    [route.params.id]
  );

  // ✅ Pick Image
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      await uploadImageAsync(result.assets[0].uri);
    }
  };

  // ✅ Upload Image
  const uploadImageAsync = async (uri) => {
    setUploading(true);
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = () => reject(new TypeError("Network request failed"));
      xhr.responseType = "blob";
      xhr.open("GET", uri, true);
      xhr.send(null);
    });

    const randomString = uuid.v4();
    const fileRef = ref(getStorage(), randomString);
    const uploadTask = uploadBytesResumable(fileRef, blob);

    uploadTask.on(
      "state_changed",
      null,
      (error) => console.log(error),
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        setUploading(false);
        onSend([
          {
            _id: randomString,
            createdAt: new Date(),
            text: "",
            image: downloadUrl,
            user: {
              _id: auth?.currentUser?.email,
              name: auth?.currentUser?.displayName,
              avatar: "https://i.pravatar.cc/300",
            },
          },
        ]);
      }
    );
  };

  // ✅ Emoji toggle
  const handleEmojiPanel = useCallback(() => {
    setModal((prevModal) => {
      Keyboard.dismiss();
      return !prevModal;
    });
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      {uploading && <RenderLoadingUpload />}

      <GiftedChat
        messages={messages}
        onSend={(messagesArr) => onSend(messagesArr)}
        user={{
          _id: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          avatar: "https://i.pravatar.cc/300",
        }}
        renderBubble={(props) => <RenderBubble {...props} />}
        renderInputToolbar={(props) =>
          RenderInputToolbar(props, handleEmojiPanel, pickImage)
        }
        showAvatarForEveryMessage={false}
        renderAvatarOnTop
        renderUsernameOnMessage
        minInputToolbarHeight={60}
        messagesContainerStyle={{ backgroundColor: "#fff" }}
        textInputStyle={{ color: "#333", fontSize: 15 }}
        scrollToBottom
        scrollToBottomStyle={styles.scrollToBottom}
      />

      {modal && (
        <EmojiModal
          onPressOutside={handleEmojiPanel}
          modalStyle={styles.emojiModal}
          containerStyle={styles.emojiContainer}
          columns={6}
          emojiSize={40}
          onEmojiSelected={(emoji) => {
            onSend([
              {
                _id: uuid.v4(),
                createdAt: new Date(),
                text: emoji,
                user: {
                  _id: auth?.currentUser?.email,
                  name: auth?.currentUser?.displayName,
                  avatar: "https://i.pravatar.cc/300",
                },
              },
            ]);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "#fafafa",
    borderTopWidth: 0.5,
    borderColor: "#ddd",
  },
  inputToolbar: {
    flex: 1,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#ccc",
    marginHorizontal: 3,
    backgroundColor: "#fff",
  },
  sendBtn: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: "#ccc",
    height: 40,
    width: 40,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
  iconBtn: {
    padding: 4,
    marginHorizontal: 2,
  },
  scrollToBottom: {
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "white",
  },
  emojiContainer: {
    height: 300,
    width: width,
  },
  emojiModal: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});

Chat.propTypes = { route: PropTypes.object.isRequired };
export default Chat;
