import React, { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "@/presentation/context/AuthContext";
import { Header } from "@/presentation/components/Header";
import { LoginScreen } from "@/presentation/screens/LoginScreen";
import { DashboardScreen } from "@/presentation/screens/DashboardScreen";
import { AdminScreen } from "@/presentation/screens/AdminScreen";
import { DeleteModal } from "@/presentation/components/DeleteModal";
import { userApi } from "@/data/api/userApi";
import { theme } from "@/presentation/theme";

const MainAppNavigator: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [currentView, setCurrentView] = useState<"dashboard" | "admin">("dashboard");
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState<boolean>(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState<boolean>(false);

  if (isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const handleConfirmDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await userApi.deleteAccount();
      setIsDeleteAccountModalOpen(false);
      await logout();
    } catch (err: any) {
      console.warn("Account deletion failed:", err);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.surface} />
      <Header
        currentView={currentView}
        onToggleView={setCurrentView}
        onOpenDeleteAccount={() => setIsDeleteAccountModalOpen(true)}
      />

      {currentView === "dashboard" ? (
        <DashboardScreen onOpenDeleteAccount={() => setIsDeleteAccountModalOpen(true)} />
      ) : (
        <AdminScreen />
      )}

      {/* Delete Account Confirmation Modal */}
      <DeleteModal
        visible={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        title="Delete My Data & Account"
        message="Are you sure you want to permanently delete your account and all associated workspace credentials? This operation cannot be undone."
        onConfirm={handleConfirmDeleteAccount}
        isDeleting={isDeletingAccount}
      />
    </SafeAreaView>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MainAppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.background,
  },
});
