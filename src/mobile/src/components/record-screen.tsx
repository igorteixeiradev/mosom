import { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { theme } from "../constants/theme";
import type { Status } from "../@types/type";

interface RecordScreenProps {
  status: Status;
  errorMessage: string;
  onStart: () => void;
  onStop: () => void;
}

function PulseRing({ delay }: { delay: number }) {
  const scale = useRef(new Animated.Value(0.55)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1,
            duration: 2200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 2200,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(scale, {
          toValue: 0.55,
          duration: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.55,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, scale, opacity]);

  return (
    <Animated.View style={[styles.ring, { transform: [{ scale }], opacity }]} />
  );
}

export default function RecordScreen({
  status,
  errorMessage,
  onStart,
  onStop,
}: RecordScreenProps) {
  const isRecording = status === "recording";
  const isAnalyzing = status === "analyzing";

  const caption = isAnalyzing
    ? "Identificando a música…"
    : isRecording
      ? "Ouvindo… toque para parar"
      : "Toque para identificar a música tocando por perto";

  return (
    <View style={styles.screen}>
      <Text style={styles.wordmark}>Mosom</Text>

      <View style={styles.stage}>
        {isRecording && (
          <>
            <PulseRing delay={0} />
            <PulseRing delay={600} />
            <PulseRing delay={1200} />
          </>
        )}

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={isRecording ? onStop : onStart}
          disabled={isAnalyzing}
          accessibilityLabel={
            isRecording ? "Parar de ouvir" : "Começar a ouvir"
          }
        >
          <LinearGradient
            colors={
              isRecording
                ? [theme.accentB, theme.accentA]
                : [theme.accentA, theme.accentB]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.button, isAnalyzing && styles.buttonDisabled]}
          >
            {isAnalyzing ? (
              <ActivityIndicator color={theme.bg} />
            ) : (
              <Feather name="mic" size={34} color={theme.bg} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <Text style={styles.caption}>{caption}</Text>
      {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: "100%", maxWidth: 360, alignItems: "center" },
  wordmark: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.textMuted,
    marginBottom: 32,
  },
  stage: {
    width: 220,
    height: 220,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
    borderColor: theme.accentA,
  },
  button: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: theme.accentA,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  buttonDisabled: { opacity: 0.85 },
  caption: {
    marginTop: 28,
    fontSize: 15,
    lineHeight: 22,
    color: theme.textMuted,
    textAlign: "center",
    maxWidth: 260,
  },
  error: {
    marginTop: 12,
    fontSize: 14,
    color: theme.danger,
    textAlign: "center",
  },
});
