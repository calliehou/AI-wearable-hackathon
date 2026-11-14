// The phone's contacts, read once permission is given. Used to pick who a promise or a
// voice belongs to, and to show phone numbers and emails on contact cards.
import { Contact, ContactField, getPermissionsAsync, requestPermissionsAsync } from "expo-contacts";

export type PhoneContact = { id: string; name: string; phone?: string; email?: string };

export async function contactsPermission(ask: boolean): Promise<"granted" | "denied" | "undetermined"> {
  try {
    const r = ask ? await requestPermissionsAsync() : await getPermissionsAsync();
    return r.granted ? "granted" : r.canAskAgain ? "undetermined" : "denied";
  } catch {
    return "denied";
  }
}

export async function loadContacts(): Promise<PhoneContact[]> {
  const all = await Contact.getAllDetails([ContactField.FULL_NAME, ContactField.PHONES, ContactField.EMAILS]);
  return all
    .map((c) => ({
      id: c.id,
      name: (c.fullName ?? "").trim(),
      phone: c.phones?.[0]?.number ?? undefined,
      email: c.emails?.[0]?.address ?? undefined,
    }))
    .filter((c) => c.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

// Best contact for a name the band heard ("Callie" -> "Callie Hou").
export function findContact(contacts: PhoneContact[], name: string): PhoneContact | undefined {
  const n = name.toLowerCase();
  return contacts.find((c) => c.name.toLowerCase() === n)
    ?? contacts.find((c) => c.name.toLowerCase().split(" ")[0] === n.split(" ")[0]);
}
