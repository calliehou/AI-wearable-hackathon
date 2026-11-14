// Ask before deleting a promise; deleting removes it from Peri for good.
import { Alert } from "react-native";
import type { Todo } from "../data/types";

export function confirmDelete(todo: Todo, remove: (id: string) => Promise<void>, after?: () => void, onCancel?: () => void) {
  Alert.alert(`Delete “${todo.title}”?`, "It's removed from Peri for good.", [
    { text: "Cancel", style: "cancel", onPress: onCancel },
    { text: "Delete", style: "destructive", onPress: () => { remove(todo.id).catch(() => undefined); after?.(); } },
  ]);
}
