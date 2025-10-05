# React Native Expo LiveTalk Chat App

---


<p align="center">
  <img src="https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB" />
  <img src="https://img.shields.io/badge/firebase-%23039BE5.svg?style=for-the-badge&logo=firebase" />
  <img src="https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37" />
</p>

---

## ℹ️ Introduction

**LiveTalk** is a modern real-time chat application built using [React Native](https://reactnative.dev/) and [Expo](https://expo.dev/), powered by [Firebase](https://firebase.google.com/) (Web v9) for authentication and messaging.

This project is developed and maintained by **Adil Dotes**.

---

## ⚡ Features

| Feature               | Description                                 |
| :-------------------- | :------------------------------------------ |
| **Signup & Login**    | Firebase Email/Password authentication.     |
| **Send Text Message** | One-to-one and group text messaging.        |
| **Send Picture**      | Share pictures without losing quality.      |
| **Group Chat**        | Chat with multiple users in real time.      |
| **Delete Chat**       | Hold and select chats to delete them.       |
| **Delete Account**    | Remove your account directly from settings. |
| **Real Time Chat**    | Instant updates for new messages.           |
| **Users List**        | Registered users sorted alphabetically.     |
| **Note to Self**      | Personal notes by messaging yourself.       |

---

## 💾 Installation Guide

To set up and run the app locally:

```bash
# Clone this repository
git clone https://github.com/adildotes/LiveTalk
cd LiveTalk
# Install dependencies
npm install

# Start the Expo development server
npx expo start
```

> 📌 Make sure to configure Firebase in a `.env` file before running the app.

---

## 🏗️ Build Guide

### **EAS Build (Recommended)**

1. Create a `.env` file with your Firebase configuration.
2. Push your environment variables to EAS:

   ```bash
   eas secret:push --scope project --env-file .env
   ```
3. Build APK for Android:

   ```bash
   eas build -p android --profile preview
   ```

### **Local Build**

```bash
# For Android
npm run android

# For iOS
npm run ios
```

---

## 📝 Notes

* This project uses Firebase v9 modular SDK.
* Environment variables are required for proper Firebase configuration.
* For production builds, use [EAS](https://docs.expo.dev/eas/) for best results.

---



## 👨‍💻 Developed By

**Adil Dotes**  
Full Stack & Mobile App Developer  
[![GitHub](https://img.shields.io/badge/GitHub-adildotes-181717?style=for-the-badge&logo=github)](https://github.com/adildotes)



---
