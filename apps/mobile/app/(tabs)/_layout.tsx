import { Tabs } from "expo-router";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type TabIconProps = {
  color: string;
  size: number;
  focused: boolean;
};

const tabs = [
  {
    name: "index",
    title: "AR",
    icon: (p: TabIconProps) => (
      <Ionicons name={p.focused ? "camera" : "camera-outline"} size={p.size} color={p.color} />
    ),
  },
  {
    name: "explore",
    title: "Keşfet",
    icon: (p: TabIconProps) => (
      <Ionicons name={p.focused ? "map" : "map-outline"} size={p.size} color={p.color} />
    ),
  },
  {
    name: "create",
    title: "Bırak",
    icon: () => (
      <View style={styles.createButton}>
        <Ionicons name="add" size={28} color="white" />
      </View>
    ),
  },
  {
    name: "feed",
    title: "Feed",
    icon: (p: TabIconProps) => (
      <Ionicons name={p.focused ? "compass" : "compass-outline"} size={p.size} color={p.color} />
    ),
  },
  {
    name: "profile",
    title: "Profil",
    icon: (p: TabIconProps) => (
      <Ionicons name={p.focused ? "person" : "person-outline"} size={p.size} color={p.color} />
    ),
  },
];

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
        tabBarLabelStyle: styles.label,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: tab.icon,
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "rgba(15, 15, 26, 0.95)",
    borderTopColor: "rgba(255,255,255,0.08)",
    borderTopWidth: 1,
    height: 84,
    paddingBottom: 24,
    paddingTop: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#6366f1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    shadowColor: "#6366f1",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
});
