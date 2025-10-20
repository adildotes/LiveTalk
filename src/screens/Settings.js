import React from "react";
import PropTypes from "prop-types";
import { Ionicons } from "@expo/vector-icons";
import {
  Text,
  View,
  Linking,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";

import Cell from "../components/Cell";
import ContactRow from "../components/ContactRow";
import { auth } from "../config/firebase";
import { colors } from "../config/constants";

const Settings = ({ navigation }) => {
  const user = auth?.currentUser;

  const openGithub = async (url) => {
    if (!url) {
      Alert.alert("Coming Soon", "GitHub repository link not added yet.");
      return;
    }
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Unable to open link.");
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 🧩 User Profile */}
        <ContactRow
          name={user?.displayName ?? "No name"}
          subtitle={user?.email ?? "No email available"}
          style={styles.contactRow}
          onPress={() => navigation.navigate("Profile")}
          avatar={user?.photoURL}
        />

        {/* 🧩 Account Settings */}
        <Cell
          title="Account"
          subtitle="Privacy, logout, delete account"
          icon="key-outline"
          iconColor={colors.teal}
          onPress={() => navigation.navigate("Account")}
          style={{ marginTop: 20 }}
        />

        {/* 🧩 Help */}
        <Cell
          title="Help"
          subtitle="Contact us, app info"
          icon="help-circle-outline"
          iconColor={colors.teal}
          onPress={() => navigation.navigate("Help")}
        />

        {/* 🧩 Invite Friend */}
        <Cell
          title="Invite a friend"
          icon="people-outline"
          iconColor={colors.teal}
          onPress={() => Alert.alert("Invite", "Share this app with friends")}
          showForwardIcon={false}
        />

        {/* 🧩 Github Link */}
        <TouchableOpacity
          style={styles.githubLink}
          onPress={() => openGithub("https://github.com/adildotes/LiveTalk")}
        >
          <View style={styles.githubContainer}>
            <Ionicons
              name="logo-github"
              size={14}
              style={{ color: colors.teal }}
            />
            <Text style={styles.githubText}>App&apos;s Github</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingBottom: 30,
  },
  contactRow: {
    backgroundColor: "#fff",
    borderColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  githubContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  githubLink: {
    alignSelf: "center",
    marginTop: 20,
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
  },
  githubText: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 6,
    color: "#333",
  },
});

Settings.propTypes = {
  navigation: PropTypes.object.isRequired,
};

export default Settings;
