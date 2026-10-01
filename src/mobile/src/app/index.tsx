import { useState, useRef, useCallback } from "react";
import { StyleSheet, StatusBar } from "react-native";
import {
  useAudioRecorder,
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
} from "expo-audio";
import RecordScreen from "../components/record-screen";
import ResultScreen from "../components/result-screen";
import { theme } from "../constants/theme";
import type { Status, Track } from "../@types/type";
import { SafeAreaView } from "react-native-safe-area-context";
import { API_BASE } from "@/constants/api";

export const LISTEN_DURATION_MS = 8000;

export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [track, setTrack] = useState<Track | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const recognize = async (uri: string) => {
    try {
      const form = new FormData();
      form.append("file", {
        uri,
        name: "sample.m4a",
        type: "audio/m4a",
      } as unknown as Blob);

      const res = await fetch(`${API_BASE}/recognize`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.detail || "Não conseguimos reconhecer essa música.",
        );
      }
      setTrack((await res.json()) as Track);
      setStatus("result");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Algo deu errado ao reconhecer a música.",
      );
      setStatus("error");
    }
  };

  const stopListening = useCallback(async () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error("Gravação vazia.");
      setStatus("analyzing");
      await recognize(uri);
    } catch {
      setErrorMessage("Não foi possível processar o áudio gravado.");
      setStatus("error");
    }
  }, [audioRecorder]);

  const startListening = useCallback(async () => {
    setErrorMessage("");
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage(
          "Precisamos da permissão do microfone pra identificar a música.",
        );
        setStatus("error");
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setStatus("recording");

      timeoutRef.current = setTimeout(stopListening, LISTEN_DURATION_MS);
    } catch {
      setErrorMessage("Não foi possível acessar o microfone.");
      setStatus("error");
    }
  }, [audioRecorder, stopListening]);

  const reset = () => {
    setTrack(null);
    setErrorMessage("");
    setStatus("idle");
  };

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar barStyle="light-content" backgroundColor={theme.bg} />
      {status === "result" && track ? (
        <ResultScreen track={track} apiBase={API_BASE} onListenAgain={reset} />
      ) : (
        <RecordScreen
          status={status}
          errorMessage={errorMessage}
          onStart={startListening}
          onStop={stopListening}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
});
