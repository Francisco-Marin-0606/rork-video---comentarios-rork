import { Tabs } from "expo-router";
import { Play } from "lucide-react-native";
import React from "react";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "#666",
        tabBarStyle: {
          backgroundColor: "#000",
          borderTopColor: "#333",
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Videos",
          tabBarIcon: ({ color }) => <Play color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}