import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, getDocs } from "firebase/firestore";
import fs from "fs";
import path from "path";

const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf-8"));

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

async function migrate() {
  const TICKETS_FILE = path.join(process.cwd(), "tickets-db.json");
  const SETTINGS_FILE = path.join(process.cwd(), "settings-db.json");

  console.log("Starting migration to Firestore...");
  
  if (fs.existsSync(TICKETS_FILE)) {
    const data = JSON.parse(fs.readFileSync(TICKETS_FILE, "utf8"));
    if (Array.isArray(data) && data.length > 0) {
      console.log(`Found ${data.length} tickets locally. Checking Firestore...`);
      const existing = await getDocs(collection(db, "tickets"));
      if (existing.empty) {
        console.log("Firestore 'tickets' is empty! Migrating local tickets...");
        for (const t of data) {
          await setDoc(doc(db, "tickets", t.id), t);
        }
        console.log("Tickets migrated successfully.");
      } else {
        console.log(`Firestore already has ${existing.size} tickets. Skipping ticket migration.`);
      }
    }
  }

  if (fs.existsSync(SETTINGS_FILE)) {
     const data = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
     console.log("Checking Firestore settings...");
     const snap = await getDocs(collection(db, "settings"));
     if (snap.empty) {
        console.log("Firestore 'settings' is empty! Migrating local settings...");
        await setDoc(doc(db, "settings", "global"), data);
        console.log("Settings migrated successfully.");
     } else {
        console.log("Firestore settings exist. Skipping.");
     }
  }
  
  console.log("Migration script finished successfully.");
  process.exit(0);
}

migrate();
