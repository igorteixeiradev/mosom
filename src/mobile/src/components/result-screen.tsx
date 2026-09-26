import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { theme } from "../constants/theme";
import type { Track } from "../@types/type";

interface ResultScreenProps {
  track: Track;
  apiBase: string;
  onListenAgain: () => void;
}

type DownloadState = "idle" | "preparing" | "ready" | "error";

export default function ResultScreen({
  track,
  apiBase,
  onListenAgain,
}: ResultScreenProps) {
  const [downloadState, setDownloadState] = useState<DownloadState>("idle");
  const [downloadError, setDownloadError] = useState("");

  const cover =
    track.images?.coverarthq ||
    track.images?.coverart ||
    track.images?.background;

  const handleDownload = async () => {
    setDownloadState("preparing");
    setDownloadError("");
    try {
      const query = encodeURIComponent(`${track.artist} - ${track.title}`);
      const res = await fetch(`${apiBase}/download?query=${query}`);
      if (!res.ok) throw new Error("Não conseguimos preparar o download.");
      const data: { url: string } = await res.json();

      const destination = new File(
        Paths.document,
        `${track.artist} - ${track.title}.mp3`,
      );
      const downloaded = await File.downloadFileAsync(
        `${apiBase}${data.url}`,
        destination,
      );

      setDownloadState("ready");
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(downloaded.uri);
      }
    } catch (err) {
      setDownloadError(
        err instanceof Error ? err.message : "Falha ao baixar a música.",
      );
      setDownloadState("error");
    }
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onListenAgain} style={styles.backButton}>
        <Text style={styles.backButtonText}>← Ouvir outra</Text>
      </TouchableOpacity>

      <View style={styles.coverWrap}>
        {cover ? (
          <Image source={{ uri: cover }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {track.title}
        </Text>
        <Text style={styles.artist}>{track.artist}</Text>
      </View>

      <TouchableOpacity
        style={[
          styles.downloadButton,
          downloadState === "preparing" && styles.downloadButtonDisabled,
        ]}
        onPress={handleDownload}
        disabled={downloadState === "preparing"}
      >
        {downloadState === "preparing" ? (
          <ActivityIndicator color={theme.bg} />
        ) : (
          <Text style={styles.downloadButtonText}>
            {downloadState === "ready" ? "Baixado ✓" : "Baixar música"}
          </Text>
        )}
      </TouchableOpacity>

      {downloadError ? <Text style={styles.error}>{downloadError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { width: "100%", maxWidth: 360, alignItems: "center" },
  backButton: { alignSelf: "flex-start", paddingVertical: 8, marginBottom: 24 },
  backButtonText: { color: theme.textMuted, fontSize: 14 },
  coverWrap: {
    width: 220,
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 10,
  },
  cover: { width: "100%", height: "100%" },
  coverPlaceholder: { backgroundColor: theme.accentA },
  meta: { marginTop: 28, marginBottom: 32, alignItems: "center" },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: theme.text,
    textAlign: "center",
    marginBottom: 6,
  },
  artist: { fontSize: 15, color: theme.textMuted },
  downloadButton: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 999,
    backgroundColor: theme.text,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadButtonDisabled: { opacity: 0.6 },
  downloadButtonText: { color: theme.bg, fontSize: 15, fontWeight: "600" },
  error: {
    marginTop: 12,
    fontSize: 14,
    color: theme.danger,
    textAlign: "center",
  },
});
