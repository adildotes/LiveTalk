import React, { useState } from "react";
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
import * as ImagePicker from "expo-image-picker";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { auth, storage, db } from "../config/firebase";
import { colors } from "../config/constants";

const { width } = Dimensions.get("window");

const Profile = () => {
  const user = auth.currentUser;
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || null);

  // 📸 Image Picker
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      uploadImage(result.assets[0].uri);
    }
  };

  // ☁️ Upload to Firebase Storage
  const uploadImage = async (uri) => {
    try {
      if (!user) return;
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();

      const imageRef = ref(storage, `profiles/${user.uid}.jpg`);
      await uploadBytes(imageRef, blob);

      const downloadURL = await getDownloadURL(imageRef);

      await updateProfile(user, { photoURL: downloadURL });

      const userRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists()) {
        await updateDoc(userRef, { photoURL: downloadURL });
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          name: user.displayName,
          email: user.email,
          photoURL: downloadURL,
        });
      }

      setPhotoURL(downloadURL);
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setUploading(false);
    }
  };

  // ✏️ Update Name
  const handleSaveName = async () => {
    if (!user) return;
    if (name.trim() === "") return Alert.alert("Name cannot be empty");

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

      Alert.alert("Updated", "Name successfully changed!");
      setEditingName(false);
    } catch (error) {
      Alert.alert("Error", error.message);
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
        {/* Avatar with Camera Icon */}
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

        {/* Name Section */}
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

        {/* Email */}
        <View style={styles.infoBox}>
          <View style={styles.row}>
            <Ionicons name="mail-outline" size={20} color={colors.teal} />
            <Text style={styles.text}>{user?.email}</Text>
          </View>
        </View>

        {/* About */}
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
