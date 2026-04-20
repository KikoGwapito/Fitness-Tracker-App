import { auth, db } from '../firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
  reauthenticateWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  serverTimestamp,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { FoodLog, UserProfile } from '../types';
import { handleFirestoreError, OperationType } from '../lib/error-handler';

class FirebaseService {
  setupRecaptcha(containerId: string) {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
      });
    }
    return (window as any).recaptchaVerifier;
  }

  async sendPhoneOTP(phoneNumber: string, appVerifier: any) {
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  }

  async signInWithEmail(email: string, pass: string): Promise<User | null> {
    const creds = await signInWithEmailAndPassword(auth, email, pass);
    return creds.user;
  }

  async signUpWithEmail(email: string, pass: string): Promise<User | null> {
    const creds = await createUserWithEmailAndPassword(auth, email, pass);
    if (creds.user) {
      await sendEmailVerification(creds.user);
    }
    return creds.user;
  }

  async checkEmailExists(email: string): Promise<boolean> {
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email);
      return methods.length > 0;
    } catch (error) {
      console.warn("Could not fetch sign in methods. Ensure email enumeration protection is disabled if this fails.", error);
      // Fallback: If it throws because of enumeration protection, we can't reliably check here, but we'll re-throw for the component.
      throw error;
    }
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(auth, email);
  }

  async resendVerificationEmail(user: User): Promise<void> {
    await sendEmailVerification(user);
  }

  async reauthenticateAndVerify(user: User, passOrCode: string, method: 'email' | 'phone') {
    if (method === 'email') {
      if (!user.email) throw new Error("No email linked to this account");
      const cred = EmailAuthProvider.credential(user.email, passOrCode);
      await reauthenticateWithCredential(user, cred);
    } else if (method === 'phone') {
      // For phone, the passOrCode needs to be handled via the confirmation result from OTP.
      // We will handle phone OTP re-auth directly in the component.
      throw new Error("Phone re-auth should be handled via confirmation result");
    }
  }

  async deleteAccountAndData(user: User) {
    // Note: Due to security rules, users can delete their own documents.
    // Realistically a Cloud Function should clean up all nested collections, 
    // but we'll try to delete what we can here.
    try {
      const userRef = doc(db, 'users', user.uid);
      await deleteDoc(userRef);
      await deleteUser(user);
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  /**
   * Authentication Logic: Implement a signInWithGoogle() function using firebase_auth.
   * Ensure the User object is captured to retrieve the unique uid.
   */
  async signInWithGoogle(): Promise<User | null> {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      const result = await signInWithPopup(auth, provider);
      return result.user;
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        console.error("Error signing in with Google:", error);
      }
      throw error;
    }
  }

  /**
   * Data Mapping: When Gemini processes a food image or text, it must return a JSON object.
   * Create a function saveMealToFirebase(String uid, Map macroData) that pushes this JSON to the user's specific sub-collection.
   * 
   * Database Pathing (Firestore): All food data must be saved to a hierarchical path: users/{uid}/food_logs/{logId}.
   */
  async saveMealToFirebase(uid: string, mealData: any, isValidated: boolean, customTimestamp?: Date) {
    const logRef = collection(db, `users/${uid}/food_logs`);
    
    // User Data Schema to use:
    const data: any = {
      userId: uid,
      timestamp: customTimestamp || serverTimestamp(), // Ensure the Timestamp is automatically added to every entry
      foodName: mealData.food_name || mealData.foodName || "Logged Meal",
      macros: {
        calories: mealData.calories || 0,
        protein: mealData.protein_g || mealData.protein || 0,
        carbs: mealData.carbs_g || mealData.carbs || 0,
        fat: mealData.fat_g || mealData.fat || 0,
      },
      isValidated: isValidated,
      // Including additional fields required for app functionality
      sugar_g: mealData.sugar_g || 0,
      sodium_mg: mealData.sodium_mg || 0,
      health_score: mealData.health_score || 0,
      coach_tip: mealData.coach_tip || "",
      status: mealData.status || (isValidated ? 'confirmed' : 'pending')
    };
    
    if (mealData.image_url) data.image_url = mealData.image_url;
    if (mealData.clarification_required) data.clarification_required = mealData.clarification_required;
    if (mealData.reason) data.reason = mealData.reason;
    if (mealData.isPinned !== undefined) data.isPinned = mealData.isPinned;
    if (mealData.deletedFromLogs !== undefined) data.deletedFromLogs = mealData.deletedFromLogs;
    
    try {
      return await addDoc(logRef, data);
    } catch (error: any) {
      if (error.message && error.message.includes('exceeds the maximum allowed size')) {
        console.warn("Document too large, retrying without image...");
        delete data.image_url;
        try {
          return await addDoc(logRef, data);
        } catch (innerError) {
          handleFirestoreError(innerError, OperationType.CREATE, `users/${uid}/food_logs`);
          throw innerError;
        }
      }
      handleFirestoreError(error, OperationType.CREATE, `users/${uid}/food_logs`);
      throw error;
    }
  }

  async updateMealInFirebase(uid: string, logId: string, mealData: any) {
    const logRef = doc(db, `users/${uid}/food_logs`, logId);
    
    const data: any = {};
    
    if (mealData.food_name !== undefined) data.foodName = mealData.food_name;
    else if (mealData.foodName !== undefined) data.foodName = mealData.foodName;

    if (mealData.calories !== undefined || mealData.macros !== undefined) {
      data.macros = {
        calories: mealData.calories ?? mealData.macros?.calories ?? 0,
        protein: mealData.protein_g ?? mealData.protein ?? mealData.macros?.protein ?? 0,
        carbs: mealData.carbs_g ?? mealData.carbs ?? mealData.macros?.carbs ?? 0,
        fat: mealData.fat_g ?? mealData.fat ?? mealData.macros?.fat ?? 0,
      };
    }

    if (mealData.status !== undefined) {
      data.isValidated = mealData.status === 'confirmed';
      data.status = mealData.status;
    }
    
    if (mealData.sugar_g !== undefined) data.sugar_g = mealData.sugar_g;
    if (mealData.sodium_mg !== undefined) data.sodium_mg = mealData.sodium_mg;
    if (mealData.health_score !== undefined) data.health_score = mealData.health_score;
    if (mealData.coach_tip !== undefined) data.coach_tip = mealData.coach_tip;
    if (mealData.image_url !== undefined) data.image_url = mealData.image_url;
    if (mealData.clarification_required !== undefined) data.clarification_required = mealData.clarification_required;
    if (mealData.reason !== undefined) data.reason = mealData.reason;
    if (mealData.isPinned !== undefined) data.isPinned = mealData.isPinned;
    if (mealData.deletedFromLogs !== undefined) data.deletedFromLogs = mealData.deletedFromLogs;

    try {
      await updateDoc(logRef, data);
    } catch (error: any) {
      if (error.message && error.message.includes('exceeds the maximum allowed size')) {
        console.warn("Document too large, retrying without image...");
        delete data.image_url;
        try {
          await updateDoc(logRef, data);
          return;
        } catch (innerError) {
          handleFirestoreError(innerError, OperationType.UPDATE, `users/${uid}/food_logs/${logId}`);
          throw innerError;
        }
      }
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}/food_logs/${logId}`);
      throw error;
    }
  }

  async deleteMealFromFirebase(uid: string, logId: string) {
    try {
      await deleteDoc(doc(db, `users/${uid}/food_logs`, logId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${uid}/food_logs/${logId}`);
      throw error;
    }
  }

  // Activities removed

  subscribeToMeals(uid: string, callback: (logs: FoodLog[]) => void) {
    const q = query(
      collection(db, `users/${uid}/food_logs`),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
      const logs: FoodLog[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Map Firestore schema back to app's FoodLog interface
        logs.push({
          id: doc.id,
          userId: data.userId,
          timestamp: data.timestamp?.toMillis?.() || data.timestamp || Date.now(),
          foodName: data.foodName,
          macros: {
            calories: data.macros?.calories || data.macros?.cal || 0,
            protein: data.macros?.protein || data.macros?.p || 0,
            carbs: data.macros?.carbs || data.macros?.c || 0,
            fat: data.macros?.fat || data.macros?.f || 0,
          },
          sugar_g: data.sugar_g || 0,
          sodium_mg: data.sodium_mg || 0,
          health_score: data.health_score || 0,
          coach_tip: data.coach_tip || "",
          image_url: data.image_url,
          isValidated: data.isValidated,
          status: data.status,
          clarification_required: data.clarification_required,
          reason: data.reason,
          isPinned: data.isPinned || false,
          deletedFromLogs: data.deletedFromLogs || false
        } as FoodLog);
      });
      callback(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}/food_logs`);
    });
  }

  async ensureUserProfile(user: User, defaultGoals: any) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email || 'unknown@example.com',
          daily_goals: defaultGoals,
          created_at: Date.now()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}`);
    }
  }

  subscribeToProfile(uid: string, callback: (profile: UserProfile) => void) {
    return onSnapshot(doc(db, 'users', uid), (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as UserProfile);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    });
  }

  async updateProfileSettings(uid: string, settings: any) {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, { settings });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  }

  async saveSchedule(uid: string, date: string, text: string) {
    try {
      const scheduleRef = doc(db, `users/${uid}/schedules`, date);
      await setDoc(scheduleRef, {
        userId: uid,
        date,
        text,
        createdAt: Date.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${uid}/schedules`);
    }
  }

  subscribeToSchedules(uid: string, callback: (schedules: Record<string, string>) => void) {
    const q = collection(db, `users/${uid}/schedules`);
    return onSnapshot(q, (snapshot) => {
      const schedules: Record<string, string> = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        schedules[data.date] = data.text;
      });
      callback(schedules);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${uid}/schedules`);
    });
  }
}

export const firebaseService = new FirebaseService();
