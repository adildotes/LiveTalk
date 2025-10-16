// screens/Chat.js
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
import { Send, Bubble, GiftedChat, InputToolbar } from "react-native-gifted-chat";

import { colors } from "../config/constants";
import { auth, database } from "../config/firebase";
import { CLOUDINARY_CONFIG } from "../config/cloudinary";

const { width } = Dimensions.get("window");

const RenderLoadingUpload = () => (
  <View style={styles.loadingOverlay}>
    <ActivityIndicator size="large" color={colors.teal} />
  </View>
);

const RenderBubble = (props) => (
  <Bubble
    {...props}
    wrapperStyle={{
      right: {
        backgroundColor: colors.primary,
        borderRadius: 20,
        padding: 6,
        marginVertical: 4,
        marginRight: 4,
      },
      left: {
        backgroundColor: "#f1f1f1",
        borderRadius: 20,
        padding: 6,
        marginVertical: 4,
        marginLeft: 4,
      },
    }}
    textStyle={{
      right: { color: "#fff", fontSize: 15 },
      left: { color: "#333", fontSize: 15 },
    }}
  />
);

const RenderEmojiButton = (handleEmojiPanel) => (
  <TouchableOpacity style={styles.iconBtn} onPress={handleEmojiPanel}>
    <Ionicons name="happy-outline" size={26} color={colors.teal} />
  </TouchableOpacity>
);

const RenderAttachButton = (onPick) => (
  <TouchableOpacity style={styles.iconBtn} onPress={onPick}>
    <Ionicons name="attach-outline" size={26} color={colors.teal} />
  </TouchableOpacity>
);

const RenderInputToolbar = (props, handleEmojiPanel, pickImage) => (
  <View style={styles.inputWrapper}>
    {RenderEmojiButton(handleEmojiPanel)}
    {RenderAttachButton(pickImage)}
    <InputToolbar {...props} containerStyle={styles.inputToolbar} primaryStyle={{ alignItems: "center" }} />
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

  useEffect(() => {
    const chatRef = doc(database, "chats", route.params.id);
    const unsubscribe = onSnapshot(chatRef, (document) => {
      if (!document.exists()) {
        setMessages([]);
        return;
      }
      const data = document.data();
      const msgs = (data.messages || [])
        .map((m) => {
          let createdAt = m.createdAt;
          try {
            // handle Firestore Timestamp or ISO string
            createdAt = m.createdAt?.toDate?.() ?? (m.createdAt ? new Date(m.createdAt) : new Date());
          } catch {
            createdAt = new Date();
          }
          return {
            ...m,
            createdAt,
            image: m.image ?? null,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);

      setMessages(msgs);
    });

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

  const onSend = useCallback(
    async (m = []) => {
      const chatDocRef = doc(database, "chats", route.params.id);
      const chatDocSnap = await getDoc(chatDocRef);
      const chatData = chatDocSnap.data() || {};
      const data = (chatData.messages || []).map((message) => ({
        ...message,
        createdAt: message.createdAt?.toDate?.() ?? new Date(message.createdAt),
        image: message.image ?? null,
      }));

      const messageToSend = {
        ...m[0],
        sent: true,
        received: false,
      };

      const chatMessages = GiftedChat.append(data, messageToSend);

      await setDoc(chatDocRef, {
        messages: chatMessages,
        lastUpdated: Date.now(),
      }, { merge: true });
    },
    [route.params.id]
  );

  // pick image and upload to Cloudinary
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        return Alert.alert("Permission required", "Permission to access media library is required.");
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets?.length) {
        await uploadImageAsync(res.assets[0].uri);
      }
    } catch (err) {
      console.error("Pick image error:", err);
    }
  };

  // upload to Cloudinary and send as chat message
  const uploadImageAsync = async (uri) => {
    if (!CLOUDINARY_CONFIG.uploadPreset || !CLOUDINARY_CONFIG.cloudName) {
      Alert.alert("Cloudinary not configured", "Please set Cloudinary config.");
      return;
    }

    try {
      setUploading(true);

      const response = await fetch(uri);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append("file", {
        uri,
        type: blob.type || "image/jpeg",
        name: `chat_${uuid.v4()}.jpg`,
      });
      formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

      const uploadRes = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const text = await uploadRes.text();
        throw new Error("Cloudinary upload failed: " + text);
      }

      const uploadJson = await uploadRes.json();
      const imageUrl = uploadJson.secure_url;

      // send message with imageUrl
      onSend([
        {
          _id: uuid.v4(),
          createdAt: new Date(),
          text: "",
          image: imageUrl,
          user: {
            _id: auth?.currentUser?.email,
            name: auth?.currentUser?.displayName,
            avatar: auth?.currentUser?.photoURL || "https://i.pravatar.cc/300",
          },
        },
      ]);
    } catch (err) {
      console.error("Upload error:", err);
      Alert.alert("Upload failed", err.message || String(err));
    } finally {
      setUploading(false);
    }
  };

  const handleEmojiPanel = useCallback(() => {
    setModal((prev) => {
      Keyboard.dismiss();
      return !prev;
    });
  }, []);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "#fff" }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
      {uploading && <RenderLoadingUpload />}

      <GiftedChat
        messages={messages}
        onSend={(messagesArr) => onSend(messagesArr)}
        user={{
          _id: auth?.currentUser?.email,
          name: auth?.currentUser?.displayName,
          avatar: auth?.currentUser?.photoURL || "https://i.pravatar.cc/300",
        }}
        renderBubble={(props) => <RenderBubble {...props} />}
        renderInputToolbar={(props) => RenderInputToolbar(props, handleEmojiPanel, pickImage)}
        showAvatarForEveryMessage={false}
        renderAvatarOnTop
        renderUsernameOnMessage
        minInputToolbarHeight={44}
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
                  avatar: auth?.currentUser?.photoURL || "https://i.pravatar.cc/300",
                },
              },
            ]);
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

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
    marginBottom: 0,
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
    width,
  },
  emojiModal: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
});

Chat.propTypes = { route: PropTypes.object.isRequired };
export default Chat;
