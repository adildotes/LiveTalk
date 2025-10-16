// screens/Profile.js
import React, { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Text,
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
} from "react-native";
import * as FileSystem from "expo-file-system";
import * as ImagePicker from "expo-image-picker";
import { updateProfile } from "firebase/auth";
import {
  doc,
  updateDoc,
  setDoc,
  getDoc,
  collection,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "../config/firebase";
import { colors } from "../config/constants";
import { CLOUDINARY_CONFIG } from "../config/cloudinary";

const { width } = Dimensions.get("window");

const Profile = () => {
  const user = auth.currentUser;
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || null);

  // Check Cloudinary Config on mount
  useEffect(() => {
    console.log("🔍 CLOUDINARY CONFIG:", CLOUDINARY_CONFIG);
  }, []);

  // Request permission once on mount
  useEffect(() => {
    (async () => {
      try {
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      } catch { }
    })();
  }, []);

  // Pick image
  const pickImage = async () => {
    // open gallery
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    // agar user ne cancel nahi kiya
    if (!result.canceled) {
      const image = result.assets[0];
      console.log("Selected image:", image.uri);

      // Cloudinary upload function call karo
      const uploadedUrl = await uploadImageToCloudinary(image);
      console.log("Uploaded Image URL:", uploadedUrl);
    }
  };

  // Upload image to Cloudinary
  const uploadImageToCloudinary = async (image) => {
    try {
      // ✅ image.uri milta hai ImagePicker se
      const base64 = await FileSystem.readAsStringAsync(image.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const data = {
        file: `data:image/jpeg;base64,${base64}`,
        upload_preset: process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
        cloud_name: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME,
      };

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        }
      );

      const responseData = await res.json();

      if (responseData.secure_url) {
        console.log("✅ Uploaded Image URL:", responseData.secure_url);
        return responseData.secure_url;
      } else {
        console.log("❌ Cloudinary upload failed:", responseData);
        Alert.alert("Upload Failed", responseData?.error?.message || "Unknown error");
        return null;
      }
    } catch (error) {
      console.error("Cloudinary upload failed:", error);
      Alert.alert("Upload Error", error.message);
      return null;
    }
  };



  // Save new display name
  const handleSaveName = async () => {
    if (!user) return;
    if (name.trim() === "")
      return Alert.alert("Validation", "Name cannot be empty");

    try {
      await updateProfile(user, { displayName: name });

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await updateDoc(userRef, { name });
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          name,
          email: user.email,
          photoURL: user.photoURL || null,
        });
      }

      await propagateProfileChange({
        name,
        photoURL: user.photoURL || photoURL,
      });

      Alert.alert("Updated", "Name successfully changed!");
      setEditingName(false);
    } catch (error) {
      Alert.alert("Error", error.message);
      console.error("Name update error:", error);
    }
  };

  // Propagate profile name/photo changes to all chats
  const propagateProfileChange = async ({ name: newName, photoURL: newPhoto }) => {
    if (!user) return;
    try {
      const chatsCol = collection(db, "chats");
      const chatsSnap = await getDocs(chatsCol);

      const updates = [];

      for (const chatDoc of chatsSnap.docs) {
        const data = chatDoc.data();
        let modified = false;
        const updated = { ...data };

        if (Array.isArray(data.users)) {
          const newUsers = data.users.map((u) => {
            if (u?.email === user.email) {
              modified = true;
              return {
                ...u,
                name: newName ?? u.name,
                photoURL: newPhoto ?? u.photoURL,
              };
            }
            return u;
          });
          if (modified) updated.users = newUsers;
        }

        if (Array.isArray(data.messages) && data.messages.length > 0) {
          const newMessages = data.messages.map((m) => {
            const userObj = m?.user;
            const userId = userObj?._id || userObj?.id || userObj?.email;
            if (userId === user.email) {
              modified = true;
              return {
                ...m,
                user: {
                  ...userObj,
                  name: newName ?? userObj.name,
                  avatar: newPhoto ?? userObj.avatar,
                },
              };
            }
            return m;
          });
          if (modified) updated.messages = newMessages;
        }

        if (modified) updates.push(updateDoc(chatDoc.ref, updated));
      }

      if (updates.length > 0) await Promise.all(updates);
    } catch (err) {
      console.error("Error propagating profile change:", err);
    }
  };

  const initials =
    user?.displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("") || user?.email?.charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickImage}>
            {photoURL ? (
              <Image source={{ uri: photoURL }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarLabel}>{initials}</Text>
              </View>
            )}
            {uploading && (
              <ActivityIndicator
                size="large"
                color={colors.teal}
                style={styles.loader}
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cameraIcon} onPress={pickImage}>
            <Ionicons name="camera-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter new name"
                placeholderTextColor="#888"
              />
              <TouchableOpacity onPress={handleSaveName} style={styles.saveBtn}>
                <Text style={{ color: "white", fontWeight: "bold" }}>Save</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.nameText}>
                {user?.displayName || "No name set"}
              </Text>
              <TouchableOpacity onPress={() => setEditingName(true)}>
                <Ionicons name="pencil-outline" size={18} color={colors.teal} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={20} color={colors.teal} />
            <Text style={styles.text}>{user?.email}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Ionicons
              name="information-circle-outline"
              size={20}
              color={colors.teal}
            />
            <Text style={styles.text}>Available</Text>
            <TouchableOpacity onPress={() => Alert.alert("Coming soon")}>
              <Ionicons name="pencil-outline" size={18} color="#444" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  scroll: { alignItems: "center", paddingBottom: 40 },
  avatarContainer: { marginTop: 20, marginBottom: 10, position: "relative" },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 60,
    height: 120,
    justifyContent: "center",
    width: 120,
  },
  avatarImage: { width: 120, height: 120, borderRadius: 60 },
  avatarLabel: { color: "white", fontSize: 36, fontWeight: "bold" },
  loader: { position: "absolute", top: 45, left: 45 },
  cameraIcon: {
    alignItems: "center",
    backgroundColor: colors.teal,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    position: "absolute",
    right: -5,
    bottom: 0,
    width: 36,
  },
  infoBox: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 14,
    marginVertical: 8,
    width: width * 0.9,
    elevation: 1,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  editRow: { flexDirection: "row", alignItems: "center" },
  input: { flex: 1, fontSize: 16, marginRight: 10, color: "#000" },
  saveBtn: {
    backgroundColor: colors.teal,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  nameText: { fontSize: 18, fontWeight: "600", color: "#000", flex: 1 },
  text: { fontSize: 16, color: "#000", marginLeft: 10, flex: 1 },
});

export default Profile;
